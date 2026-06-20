import "server-only";
import {
  aggregateRolePermissions,
  applyPermissionOverrides,
  buildFullAccessPermissions,
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

    return buildFullAccessPermissions(
      connectionId,
      (tables ?? []).map((t) => t.table_name),
    );
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

  const permMap = aggregateRolePermissions(rolePerms);

  const resolvedMap = applyPermissionOverrides(permMap, overrides ?? []);

  return Array.from(resolvedMap.entries()).map(([table_name, perm]) => ({
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
