import "server-only";
import { ORPCError } from "@orpc/server";
import {
  getUserConnectionIds,
  isSetupComplete,
  requirePlatformAdmin,
} from "@supa-admin/auth/permissions";
import {
  createMetaServerClient,
  createMetaServiceClient,
} from "@supa-admin/auth/server";
import { encrypt } from "@supa-admin/crypto";
import {
  buildAppMetadataPermissions,
  executeRlsSync,
  executeTargetBootstrap,
  getConnectionOnboardingStatus,
  previewRlsSync,
  probeConnectionBootstrap,
  syncTargetUserPermissions,
  verifyConnectionBootstrap,
} from "@supa-admin/rls";
import { fetchSchemaViaRest, syncConnectionSchema } from "@supa-admin/schema";
import { createTargetAdminClient } from "@supa-admin/supabase-target/admin";
import { validateTargetUrl } from "@supa-admin/utils";
import { env } from "@/lib/env";
import { os, withAdmin, withAuth } from "../os";
import { verifySetupSecret } from "../verify-setup-secret";

export const setupHandlers = os.setup.router({
  createAdmin: os.setup.createAdmin.handler(async ({ input }) => {
    verifySetupSecret(input.setupSecret, env.SETUP_SECRET);

    const service = createMetaServiceClient();

    const { data: lockRows, error: lockError } = await service
      .from("app_settings")
      .update({ value: { status: "in_progress" } })
      .eq("key", "setup_complete")
      .eq("value", false)
      .select("key");

    if (lockError || !lockRows?.length) {
      throw new ORPCError("BAD_REQUEST", { message: "Setup already complete" });
    }

    try {
      const { data: userData, error: userError } =
        await service.auth.admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: true,
          app_metadata: { role: "platform_admin" },
          user_metadata: { display_name: input.displayName },
        });

      if (userError) {
        throw new ORPCError("BAD_REQUEST", { message: userError.message });
      }

      await service
        .from("profiles")
        .update({ role: "platform_admin", display_name: input.displayName })
        .eq("id", userData.user.id);

      await service
        .from("app_settings")
        .update({ value: true })
        .eq("key", "setup_complete");

      return { success: true as const };
    } catch (err) {
      await service
        .from("app_settings")
        .update({ value: false })
        .eq("key", "setup_complete");
      throw err;
    }
  }),

  isComplete: os.setup.isComplete.handler(async () => ({
    complete: await isSetupComplete(),
  })),
});

export const connectionsHandlers = os.connections.router({
  list: os.connections.list.use(withAdmin).handler(async () => {
    const supabase = await createMetaServerClient();
    const { data, error } = await supabase
      .from("connections")
      .select(
        "id, name, url, schema_cached_at, bootstrap_status, bootstrap_verified_at, created_at, updated_at",
      )
      .order("created_at", { ascending: false });
    if (error)
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: error.message });
    return { connections: data ?? [] };
  }),

  create: os.connections.create.use(withAdmin).handler(async ({ input }) => {
    const urlCheck = validateTargetUrl(input.url);
    if (!urlCheck.ok) {
      throw new ORPCError("BAD_REQUEST", { message: urlCheck.reason });
    }

    const serviceRoleEnc = encrypt(input.serviceRoleKey);
    const test = await fetchSchemaViaRest(input.url, serviceRoleEnc);
    if (test.error && test.tables.length === 0) {
      throw new ORPCError("BAD_REQUEST", { message: test.error });
    }

    const supabase = await createMetaServerClient();
    const profile = await requirePlatformAdmin();

    const { data, error } = await supabase
      .from("connections")
      .insert({
        name: input.name,
        url: input.url.replace(/\/$/, ""),
        anon_key_enc: encrypt(input.anonKey),
        service_role_enc: serviceRoleEnc,
        created_by: profile.id,
        bootstrap_status: "pending",
      })
      .select(
        "id, name, url, schema_cached_at, bootstrap_status, bootstrap_verified_at",
      )
      .single();

    if (error)
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: error.message });

    if (test.tables.length > 0) {
      await supabase.from("connection_tables").insert(
        test.tables.map((t) => ({
          connection_id: data.id,
          table_name: t.table_name,
          columns: t.columns,
        })),
      );
      await supabase
        .from("connections")
        .update({ schema_cached_at: new Date().toISOString() })
        .eq("id", data.id);
    }

    const probe = await probeConnectionBootstrap(
      data.id,
      data.url,
      serviceRoleEnc,
    );

    let connection = data;
    let setupSql: string | undefined;

    if (probe.ready) {
      const bootstrap = await executeTargetBootstrap(
        data.id,
        data.url,
        serviceRoleEnc,
      );
      if (bootstrap.success) {
        const { data: updated } = await supabase
          .from("connections")
          .select(
            "id, name, url, schema_cached_at, bootstrap_status, bootstrap_verified_at",
          )
          .eq("id", data.id)
          .single();
        if (updated) connection = updated;
      }
    } else {
      setupSql = probe.setupSql;
    }

    return {
      connection,
      tableCount: test.tables.length,
      setupSql,
    };
  }),

  get: os.connections.get.use(withAdmin).handler(async ({ input }) => {
    const supabase = await createMetaServerClient();
    const { data, error } = await supabase
      .from("connections")
      .select(
        "id, name, url, schema_cached_at, bootstrap_status, bootstrap_verified_at, created_at",
      )
      .eq("id", input.id)
      .single();
    if (error) throw new ORPCError("NOT_FOUND", { message: error.message });

    const { data: tables } = await supabase
      .from("connection_tables")
      .select("*")
      .eq("connection_id", input.id)
      .order("table_name");

    return { connection: data, tables: tables ?? [] };
  }),

  delete: os.connections.delete.use(withAdmin).handler(async ({ input }) => {
    const supabase = await createMetaServerClient();
    const { error } = await supabase
      .from("connections")
      .delete()
      .eq("id", input.id);
    if (error)
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: error.message });
    return { success: true as const };
  }),

  schemaSync: os.connections.schemaSync
    .use(withAdmin)
    .handler(async ({ input }) => {
      const supabase = await createMetaServerClient();
      const { data: connection, error } = await supabase
        .from("connections")
        .select("*")
        .eq("id", input.id)
        .single();
      if (error || !connection) {
        throw new ORPCError("NOT_FOUND", { message: "Connection not found" });
      }

      const result = await syncConnectionSchema(
        input.id,
        connection.url,
        connection.service_role_enc,
      );
      if (!result.success) {
        throw new ORPCError("BAD_REQUEST", { message: result.error });
      }
      return { success: true as const, tableCount: result.tableCount ?? 0 };
    }),

  bootstrap: os.connections.bootstrap.router({
    probe: os.connections.bootstrap.probe
      .use(withAdmin)
      .handler(async ({ input }) => {
        const supabase = await createMetaServerClient();
        const { data: connection, error } = await supabase
          .from("connections")
          .select("*")
          .eq("id", input.id)
          .single();
        if (error || !connection) {
          throw new ORPCError("NOT_FOUND", { message: "Connection not found" });
        }

        const probe = await probeConnectionBootstrap(
          input.id,
          connection.url,
          connection.service_role_enc,
        );

        if (probe.ready) {
          await executeTargetBootstrap(
            input.id,
            connection.url,
            connection.service_role_enc,
          );
          return { status: "ready" as const };
        }
        return { status: "pending" as const, setupSql: probe.setupSql };
      }),

    apply: os.connections.bootstrap.apply
      .use(withAdmin)
      .handler(async ({ input }) => {
        const supabase = await createMetaServerClient();
        const { data: connection, error } = await supabase
          .from("connections")
          .select("*")
          .eq("id", input.id)
          .single();
        if (error || !connection) {
          throw new ORPCError("NOT_FOUND", { message: "Connection not found" });
        }

        const result = await executeTargetBootstrap(
          input.id,
          connection.url,
          connection.service_role_enc,
        );
        if (!result.success) {
          throw new ORPCError("BAD_REQUEST", { message: result.error });
        }
        return { success: true as const, status: "ready" as const };
      }),

    verify: os.connections.bootstrap.verify
      .use(withAdmin)
      .handler(async ({ input }) => {
        const supabase = await createMetaServerClient();
        const { data: connection, error } = await supabase
          .from("connections")
          .select("*")
          .eq("id", input.id)
          .single();
        if (error || !connection) {
          throw new ORPCError("NOT_FOUND", { message: "Connection not found" });
        }

        const result = await verifyConnectionBootstrap(
          input.id,
          connection.url,
          connection.service_role_enc,
        );
        if (!result.success) {
          throw new ORPCError("BAD_REQUEST", {
            message: result.error,
            data: result.setupSql ? { setupSql: result.setupSql } : undefined,
          });
        }
        return { success: true as const, status: "ready" as const };
      }),
  }),

  onboarding: os.connections.onboarding.router({
    status: os.connections.onboarding.status
      .use(withAuth)
      .handler(async ({ input, context }) => {
        const allowedIds = await getUserConnectionIds(
          context.profile.id,
          context.profile.role,
        );
        if (!allowedIds.includes(input.id)) {
          throw new ORPCError("FORBIDDEN", { message: "Forbidden" });
        }
        return getConnectionOnboardingStatus(input.id);
      }),
  }),

  target: os.connections.target.router({
    syncPermissions: os.connections.target.syncPermissions
      .use(withAuth)
      .handler(async ({ input, context }) => {
        const allowedIds = await getUserConnectionIds(
          context.profile.id,
          context.profile.role,
        );
        if (!allowedIds.includes(input.connectionId)) {
          throw new ORPCError("FORBIDDEN", { message: "Forbidden" });
        }

        const supabase = await createMetaServerClient();
        const { data: connection, error } = await supabase
          .from("connections")
          .select("*")
          .eq("id", input.connectionId)
          .single();
        if (error || !connection) {
          throw new ORPCError("NOT_FOUND", { message: "Connection not found" });
        }

        if (connection.bootstrap_status !== "ready") {
          throw new ORPCError("PRECONDITION_FAILED", {
            message: "Target bootstrap is not complete",
          });
        }

        const result = await syncTargetUserPermissions({
          metaUserId: context.profile.id,
          connectionId: input.connectionId,
          platformRole: context.profile.role,
          targetEmail: input.targetEmail,
          url: connection.url,
          serviceRoleEnc: connection.service_role_enc,
        });

        if (!result.success) {
          throw new ORPCError("PRECONDITION_FAILED", {
            message: result.message,
          });
        }

        return {
          success: true as const,
          targetUserId: result.targetUserId,
        };
      }),
  }),
});

export const connectionsRlsHandlers = os.connectionsRls.router({
  preview: os.connectionsRls.preview
    .use(withAdmin)
    .handler(async ({ input }) => {
      return previewRlsSync(input.id);
    }),

  apply: os.connectionsRls.apply.use(withAdmin).handler(async ({ input }) => {
    const profile = await requirePlatformAdmin();
    const supabase = await createMetaServerClient();
    const { data: connection, error } = await supabase
      .from("connections")
      .select("*")
      .eq("id", input.id)
      .single();
    if (error || !connection) {
      throw new ORPCError("NOT_FOUND", { message: "Connection not found" });
    }

    if (connection.bootstrap_status !== "ready") {
      throw new ORPCError("PRECONDITION_FAILED", {
        message: "Target bootstrap is not complete",
      });
    }

    const result = await executeRlsSync(
      input.id,
      connection.url,
      connection.service_role_enc,
      profile.id,
    );
    if (!result.success) {
      throw new ORPCError("BAD_REQUEST", {
        message: result.error ?? "RLS sync failed",
      });
    }
    return { success: true as const, sql: result.sql ?? "" };
  }),
});

export const rolesHandlers = os.roles.router({
  list: os.roles.list.use(withAdmin).handler(async () => {
    const supabase = await createMetaServerClient();
    const { data: roles } = await supabase
      .from("roles")
      .select("*")
      .order("name");
    return { roles: roles ?? [] };
  }),

  create: os.roles.create.use(withAdmin).handler(async ({ input }) => {
    const supabase = await createMetaServerClient();
    const { data, error } = await supabase
      .from("roles")
      .insert({ name: input.name, description: input.description })
      .select()
      .single();
    if (error) throw new ORPCError("BAD_REQUEST", { message: error.message });
    return { role: data };
  }),

  getPermissions: os.roles.getPermissions
    .use(withAdmin)
    .handler(async ({ input }) => {
      const supabase = await createMetaServerClient();
      const { data, error } = await supabase
        .from("role_permissions")
        .select("table_name, can_read, can_create, can_update, can_delete")
        .eq("role_id", input.roleId)
        .eq("connection_id", input.connectionId);
      if (error) throw new ORPCError("BAD_REQUEST", { message: error.message });
      return { permissions: data ?? [] };
    }),

  updatePermissions: os.roles.updatePermissions
    .use(withAdmin)
    .handler(async ({ input }) => {
      const supabase = await createMetaServerClient();
      const profile = await requirePlatformAdmin();

      await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", input.roleId)
        .eq("connection_id", input.connectionId);

      if (input.permissions.length > 0) {
        const { error } = await supabase.from("role_permissions").insert(
          input.permissions.map((p) => ({
            role_id: input.roleId,
            connection_id: input.connectionId,
            ...p,
          })),
        );
        if (error)
          throw new ORPCError("BAD_REQUEST", { message: error.message });
      }

      const { data: connection } = await supabase
        .from("connections")
        .select("url, service_role_enc, bootstrap_status")
        .eq("id", input.connectionId)
        .single();

      if (!connection || connection.bootstrap_status !== "ready") {
        return {
          success: true as const,
          rlsSync: {
            success: false,
            error: "Target bootstrap is not complete",
          },
        };
      }

      const rlsResult = await executeRlsSync(
        input.connectionId,
        connection.url,
        connection.service_role_enc,
        profile.id,
      );

      return {
        success: true as const,
        rlsSync: rlsResult.success
          ? { success: true }
          : { success: false, error: rlsResult.error ?? "RLS sync failed" },
      };
    }),
});

export const usersHandlers = os.users.router({
  list: os.users.list.use(withAdmin).handler(async () => {
    const supabase = await createMetaServerClient();
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, display_name, role, created_at")
      .order("created_at", { ascending: false });
    return { users: profiles ?? [] };
  }),

  create: os.users.create.use(withAdmin).handler(async ({ input }) => {
    const service = createMetaServiceClient();
    const { data, error } = await service.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      app_metadata: { role: input.role ?? "member" },
      user_metadata: { display_name: input.displayName },
    });
    if (error) throw new ORPCError("BAD_REQUEST", { message: error.message });

    await service
      .from("profiles")
      .update({ role: input.role ?? "member", display_name: input.displayName })
      .eq("id", data.user.id);

    return { user: { id: data.user.id, email: input.email } };
  }),

  get: os.users.get.use(withAdmin).handler(async ({ input }) => {
    const supabase = await createMetaServerClient();
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role_id, roles(id, name)")
      .eq("user_id", input.id);
    const { data: memberships } = await supabase
      .from("connection_members")
      .select("connection_id, connections(id, name)")
      .eq("user_id", input.id);
    return { userRoles: userRoles ?? [], memberships: memberships ?? [] };
  }),

  update: os.users.update.use(withAdmin).handler(async ({ input }) => {
    const supabase = await createMetaServerClient();
    if (input.roleIds) {
      await supabase.from("user_roles").delete().eq("user_id", input.id);
      if (input.roleIds.length > 0) {
        await supabase.from("user_roles").insert(
          input.roleIds.map((roleId) => ({
            user_id: input.id,
            role_id: roleId,
          })),
        );
      }
    }
    if (input.connectionIds) {
      await supabase
        .from("connection_members")
        .delete()
        .eq("user_id", input.id);
      if (input.connectionIds.length > 0) {
        await supabase.from("connection_members").insert(
          input.connectionIds.map((connectionId) => ({
            user_id: input.id,
            connection_id: connectionId,
          })),
        );
      }
    }
    return { success: true as const };
  }),
});

export const provisionHandlers = os.provision.router({
  createUser: os.provision.createUser
    .use(withAdmin)
    .handler(async ({ input }) => {
      const supabase = await createMetaServerClient();
      const { data: connection } = await supabase
        .from("connections")
        .select("*")
        .eq("id", input.connectionId)
        .single();
      if (!connection) {
        throw new ORPCError("NOT_FOUND", { message: "Connection not found" });
      }

      if (connection.bootstrap_status !== "ready") {
        throw new ORPCError("PRECONDITION_FAILED", {
          message: "Target bootstrap is not complete",
        });
      }

      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", input.userId)
        .single();

      const appMeta = await buildAppMetadataPermissions(
        input.userId,
        input.connectionId,
        targetProfile?.role ?? "member",
      );
      const targetAdmin = createTargetAdminClient(
        connection.url,
        connection.service_role_enc,
      );

      const { data: targetUser, error: createError } =
        await targetAdmin.auth.admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: true,
          app_metadata: appMeta,
        });
      if (createError) {
        throw new ORPCError("BAD_REQUEST", { message: createError.message });
      }

      await supabase.from("target_user_mappings").upsert({
        user_id: input.userId,
        connection_id: input.connectionId,
        target_user_id: targetUser.user.id,
        target_email: input.email,
      });

      return { success: true as const, targetUserId: targetUser.user.id };
    }),
});
