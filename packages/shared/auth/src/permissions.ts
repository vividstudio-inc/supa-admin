import "server-only";
import {
  mergePermissions,
  type PlatformRole,
  type ResolvedPermission,
  type TablePermission,
} from "@supa-admin/projections";
import { createMetaServerClient, createMetaServiceClient } from "./meta-server";

export async function getCurrentProfile() {
  const supabase = await createMetaServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function requireAuth() {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("Unauthorized");
  return profile;
}

export async function requirePlatformAdmin() {
  const profile = await requireAuth();
  if (profile.role !== "platform_admin") throw new Error("Forbidden");
  return profile;
}

export async function isSetupComplete(): Promise<boolean> {
  const service = createMetaServiceClient();
  const { data } = await service
    .from("app_settings")
    .select("value")
    .eq("key", "setup_complete")
    .single();
  return data?.value === true || data?.value?.toString() === "true";
}

export async function getUserConnectionIds(
  userId: string,
  role: PlatformRole,
): Promise<string[]> {
  if (role === "platform_admin") {
    const service = createMetaServiceClient();
    const { data } = await service.from("connections").select("id");
    return (data ?? []).map((c) => c.id);
  }

  const supabase = await createMetaServerClient();
  const { data } = await supabase
    .from("connection_members")
    .select("connection_id")
    .eq("user_id", userId);
  return (data ?? []).map((c) => c.connection_id);
}

export async function resolveUserPermissions(
  userId: string,
  connectionId: string,
  role: PlatformRole,
): Promise<ResolvedPermission[]> {
  const service = createMetaServiceClient();

  if (role === "platform_admin") {
    const { data: tables } = await service
      .from("connection_tables")
      .select("table_name")
      .eq("connection_id", connectionId);

    return (tables ?? []).map((t) => ({
      connection_id: connectionId,
      table_name: t.table_name,
      can_read: true,
      can_create: true,
      can_update: true,
      can_delete: true,
    }));
  }

  const { data: userRoles } = await service
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId);

  const roleIds = (userRoles ?? []).map((r) => r.role_id);

  let rolePerms: Array<{
    table_name: string;
    can_read: boolean;
    can_create: boolean;
    can_update: boolean;
    can_delete: boolean;
  }> = [];

  if (roleIds.length > 0) {
    const { data } = await service
      .from("role_permissions")
      .select("*")
      .eq("connection_id", connectionId)
      .in("role_id", roleIds);
    rolePerms = data ?? [];
  }

  const { data: overrides } = await service
    .from("user_permission_overrides")
    .select("*")
    .eq("user_id", userId)
    .eq("connection_id", connectionId);

  const permMap = new Map<string, TablePermission>();

  for (const rp of rolePerms) {
    const existing = permMap.get(rp.table_name);
    const merged: TablePermission = existing
      ? {
          can_read: existing.can_read || rp.can_read,
          can_create: existing.can_create || rp.can_create,
          can_update: existing.can_update || rp.can_update,
          can_delete: existing.can_delete || rp.can_delete,
        }
      : {
          can_read: rp.can_read,
          can_create: rp.can_create,
          can_update: rp.can_update,
          can_delete: rp.can_delete,
        };
    permMap.set(rp.table_name, merged);
  }

  for (const ov of overrides ?? []) {
    const existing = permMap.get(ov.table_name) ?? null;
    permMap.set(
      ov.table_name,
      mergePermissions(existing, {
        can_read: ov.can_read ?? undefined,
        can_create: ov.can_create ?? undefined,
        can_update: ov.can_update ?? undefined,
        can_delete: ov.can_delete ?? undefined,
      }),
    );
  }

  return Array.from(permMap.entries()).map(([table_name, perm]) => ({
    connection_id: connectionId,
    table_name,
    ...perm,
  }));
}

export async function canAccessTable(
  userId: string,
  connectionId: string,
  tableName: string,
  action: keyof TablePermission,
  role: PlatformRole,
): Promise<boolean> {
  const perms = await resolveUserPermissions(userId, connectionId, role);
  const tablePerm = perms.find((p) => p.table_name === tableName);
  return tablePerm?.[action] ?? false;
}
