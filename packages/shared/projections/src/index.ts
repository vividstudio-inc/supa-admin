export type PlatformRole = "platform_admin" | "member";

export type TablePermission = {
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
};

export type ColumnMeta = {
  name: string;
  data_type: string;
  is_nullable: boolean;
  column_default: string | null;
  is_primary_key: boolean;
  is_identity: boolean;
};

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  role: PlatformRole;
  created_at: string;
  updated_at: string;
};

export type Connection = {
  id: string;
  name: string;
  url: string;
  anon_key_enc: string;
  service_role_enc: string;
  schema_cached_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ConnectionTable = {
  id: string;
  connection_id: string;
  table_name: string;
  columns: ColumnMeta[];
  created_at: string;
  updated_at: string;
};

export type Role = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type RolePermission = {
  id: string;
  role_id: string;
  connection_id: string;
  table_name: string;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
};

export type UserPermissionOverride = {
  id: string;
  user_id: string;
  connection_id: string;
  table_name: string;
  can_read: boolean | null;
  can_create: boolean | null;
  can_update: boolean | null;
  can_delete: boolean | null;
};

export type ResolvedPermission = TablePermission & {
  table_name: string;
  connection_id: string;
};

export function mergePermissions(
  rolePerm: TablePermission | null,
  override: Partial<TablePermission> | null,
): TablePermission {
  const base = rolePerm ?? {
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  };
  if (!override) return base;
  return {
    can_read: override.can_read ?? base.can_read,
    can_create: override.can_create ?? base.can_create,
    can_update: override.can_update ?? base.can_update,
    can_delete: override.can_delete ?? base.can_delete,
  };
}

export type PermissionRow = {
  table_name: string;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
};

export type PermissionOverrideRow = {
  table_name: string;
  can_read: boolean | null;
  can_create: boolean | null;
  can_update: boolean | null;
  can_delete: boolean | null;
};

/** OR-merge role permissions for the same table across multiple roles. */
export function aggregateRolePermissions(
  rolePerms: PermissionRow[],
): Map<string, TablePermission> {
  const permMap = new Map<string, TablePermission>();

  for (const rp of rolePerms) {
    const existing = permMap.get(rp.table_name);
    permMap.set(
      rp.table_name,
      existing
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
          },
    );
  }

  return permMap;
}

/** Apply user-level overrides (null = inherit from role aggregate). */
export function applyPermissionOverrides(
  permMap: Map<string, TablePermission>,
  overrides: PermissionOverrideRow[],
): Map<string, TablePermission> {
  const result = new Map(permMap);

  for (const ov of overrides) {
    const existing = result.get(ov.table_name) ?? null;
    result.set(
      ov.table_name,
      mergePermissions(existing, {
        can_read: ov.can_read ?? undefined,
        can_create: ov.can_create ?? undefined,
        can_update: ov.can_update ?? undefined,
        can_delete: ov.can_delete ?? undefined,
      }),
    );
  }

  return result;
}

export function buildFullAccessPermissions(
  connectionId: string,
  tableNames: string[],
): ResolvedPermission[] {
  return tableNames.map((table_name) => ({
    connection_id: connectionId,
    table_name,
    can_read: true,
    can_create: true,
    can_update: true,
    can_delete: true,
  }));
}

export function resolvePermissionsFromRows(
  connectionId: string,
  rolePerms: PermissionRow[],
  overrides: PermissionOverrideRow[],
): ResolvedPermission[] {
  const permMap = applyPermissionOverrides(
    aggregateRolePermissions(rolePerms),
    overrides,
  );

  return Array.from(permMap.entries()).map(([table_name, perm]) => ({
    connection_id: connectionId,
    table_name,
    ...perm,
  }));
}

/** JWT app_metadata.permissions shape used by Target RLS. */
export function resolvePermissionsRecord(
  rolePerms: PermissionRow[],
  overrides: PermissionOverrideRow[],
): Record<string, TablePermission> {
  const permMap = applyPermissionOverrides(
    aggregateRolePermissions(rolePerms),
    overrides,
  );
  return Object.fromEntries(permMap);
}

export function isTextColumn(dataType: string): boolean {
  return [
    "text",
    "varchar",
    "character varying",
    "char",
    "uuid",
    "citext",
  ].some((t) => dataType.includes(t));
}

export function isJsonColumn(dataType: string): boolean {
  return dataType.includes("json");
}

export function isBooleanColumn(dataType: string): boolean {
  return dataType === "boolean";
}

export function isNumericColumn(dataType: string): boolean {
  return [
    "int",
    "integer",
    "bigint",
    "smallint",
    "numeric",
    "decimal",
    "real",
    "double",
    "float",
  ].some((t) => dataType.includes(t));
}

export function isDateColumn(dataType: string): boolean {
  return ["date", "timestamp", "time"].some((t) => dataType.includes(t));
}

export function humanizeDbError(error: {
  message?: string;
  code?: string;
}): string {
  const msg = error.message ?? "Unknown error";
  if (msg.includes("permission denied") || error.code === "42501") {
    return "permissionDenied";
  }
  if (
    msg.includes("violates row-level security") ||
    error.code === "PGRST301"
  ) {
    return "rlsViolation";
  }
  if (msg.includes("duplicate key")) {
    return "duplicateKey";
  }
  return msg;
}
