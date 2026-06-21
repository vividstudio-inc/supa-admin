import type {
  ColumnMeta,
  ForeignKeyMeta,
  ResolvedPermission,
} from "@supa-admin/projections";
import { isTextColumn } from "@supa-admin/projections";

export type ConnectionTableMeta = {
  table_name: string;
  columns: ColumnMeta[];
};

export function getTableMeta(
  allTables: ConnectionTableMeta[],
  tableName: string,
): ConnectionTableMeta | undefined {
  return allTables.find((t) => t.table_name === tableName);
}

export function canReadForeignTable(
  permissions: ResolvedPermission[],
  tableName: string,
): boolean {
  return permissions.find((p) => p.table_name === tableName)?.can_read ?? false;
}

export function canUseForeignKey(
  foreignKey: ForeignKeyMeta,
  permissions: ResolvedPermission[],
): boolean {
  return canReadForeignTable(permissions, foreignKey.table);
}

export function getPrimaryKeyColumn(
  columns: ColumnMeta[],
): ColumnMeta | undefined {
  return (
    columns.find((c) => c.is_primary_key) ??
    columns.find((c) => c.name === "id")
  );
}

const LABEL_COLUMN_NAMES = ["title", "name", "label", "email", "slug"];

export function getDisplayLabelColumn(
  columns: ColumnMeta[],
): ColumnMeta | undefined {
  for (const preferred of LABEL_COLUMN_NAMES) {
    const match = columns.find(
      (c) =>
        c.name === preferred && isTextColumn(c.data_type) && !c.is_primary_key,
    );
    if (match) return match;
  }

  return columns.find(
    (c) => isTextColumn(c.data_type) && !c.is_primary_key && !c.foreign_key,
  );
}

export function formatRowLabel(
  row: Record<string, unknown>,
  columns: ColumnMeta[],
): string {
  const pk = getPrimaryKeyColumn(columns);
  const labelCol = getDisplayLabelColumn(columns);
  const label = labelCol ? row[labelCol.name] : null;

  if (label != null && String(label).trim() !== "") {
    return String(label);
  }

  if (pk && row[pk.name] != null) {
    return String(row[pk.name]);
  }

  return "";
}

export function needsForeignKeyResync(
  allTables: ConnectionTableMeta[],
): boolean {
  return allTables.some((table) =>
    table.columns.some(
      (col) =>
        col.data_type.includes("uuid") &&
        col.name.endsWith("_id") &&
        col.name !== "id" &&
        !col.foreign_key,
    ),
  );
}

export function buildForeignKeyDetailHref(
  connectionId: string,
  foreignKey: ForeignKeyMeta,
  value: string,
): string {
  return `/${connectionId}/${foreignKey.table}?eq_${foreignKey.column}=${encodeURIComponent(value)}`;
}

export function parseTableEqFilter(
  searchParams: Record<string, string | string[] | undefined>,
): { column: string; value: string } | null {
  for (const [key, rawValue] of Object.entries(searchParams)) {
    if (!key.startsWith("eq_")) continue;
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (!value) continue;
    return { column: key.slice(3), value };
  }
  return null;
}
