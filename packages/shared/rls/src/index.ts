import "server-only";
import { createMetaServerClient } from "@supa-admin/auth/server";
import type { RolePermission } from "@supa-admin/projections";
import { createTargetAdminClient } from "@supa-admin/supabase-target/admin";
import { createHash } from "crypto";
import { generateRlsSql } from "./generate-sql";

export { generateRlsSql } from "./generate-sql";

export async function previewRlsSync(connectionId: string) {
  const supabase = await createMetaServerClient();

  const { data: permissions } = await supabase
    .from("role_permissions")
    .select("*")
    .eq("connection_id", connectionId);

  const { data: roles } = await supabase.from("roles").select("id, name");

  const sql = generateRlsSql(permissions ?? [], roles ?? []);
  const sqlHash = createHash("sha256").update(sql).digest("hex");

  return { sql, sqlHash, permissionCount: permissions?.length ?? 0 };
}

export async function executeRlsSync(
  connectionId: string,
  url: string,
  serviceRoleEnc: string,
  executedBy: string,
) {
  const { sql, sqlHash } = await previewRlsSync(connectionId);
  const admin = createTargetAdminClient(url, serviceRoleEnc);
  const supabase = await createMetaServerClient();

  try {
    const { error } = await admin.rpc(
      "exec_sql" as never,
      {
        query: sql,
      } as never,
    );
    if (error) throw new Error(error.message);

    await supabase.from("rls_sync_logs").insert({
      connection_id: connectionId,
      executed_by: executedBy,
      sql_hash: sqlHash,
      success: true,
    });

    return { success: true, sql };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await supabase.from("rls_sync_logs").insert({
      connection_id: connectionId,
      executed_by: executedBy,
      sql_hash: sqlHash,
      success: false,
      error_message: message,
    });
    return { success: false, error: message, sql };
  }
}

export async function buildAppMetadataPermissions(
  userId: string,
  connectionId: string,
) {
  const supabase = await createMetaServerClient();

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId);

  const roleIds = (userRoles ?? []).map((r) => r.role_id);
  let perms: RolePermission[] = [];

  if (roleIds.length > 0) {
    const { data } = await supabase
      .from("role_permissions")
      .select("*")
      .eq("connection_id", connectionId)
      .in("role_id", roleIds);
    perms = data ?? [];
  }

  const { data: overrides } = await supabase
    .from("user_permission_overrides")
    .select("*")
    .eq("user_id", userId)
    .eq("connection_id", connectionId);

  const result: Record<string, Record<string, boolean>> = {};

  for (const p of perms) {
    const entry = result[p.table_name] ?? {
      can_read: false,
      can_create: false,
      can_update: false,
      can_delete: false,
    };
    entry.can_read ||= p.can_read;
    entry.can_create ||= p.can_create;
    entry.can_update ||= p.can_update;
    entry.can_delete ||= p.can_delete;
    result[p.table_name] = entry;
  }

  for (const ov of overrides ?? []) {
    const entry = result[ov.table_name] ?? {
      can_read: false,
      can_create: false,
      can_update: false,
      can_delete: false,
    };
    if (ov.can_read !== null) entry.can_read = ov.can_read;
    if (ov.can_create !== null) entry.can_create = ov.can_create;
    if (ov.can_update !== null) entry.can_update = ov.can_update;
    if (ov.can_delete !== null) entry.can_delete = ov.can_delete;
    result[ov.table_name] = entry;
  }

  return { permissions: result };
}
