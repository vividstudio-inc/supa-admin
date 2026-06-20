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
