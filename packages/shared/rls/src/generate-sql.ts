import type { RolePermission } from "@supa-admin/projections";

const POLICY_PREFIX = "supaadmin_";

export function generateRlsSql(
  permissions: RolePermission[],
  roles: { id: string; name: string }[],
): string {
  const roleMap = new Map(roles.map((r) => [r.id, r.name]));
  const lines: string[] = [
    "-- SupaAdmin RLS Sync",
    "-- Helper function to read permissions from JWT app_metadata",
    `CREATE OR REPLACE FUNCTION public.supaadmin_has_permission(
  p_table text,
  p_action text
) RETURNS boolean AS $$
DECLARE
  perms jsonb;
BEGIN
  perms := (auth.jwt() -> 'app_metadata' -> 'permissions');
  IF perms IS NULL THEN RETURN false; END IF;
  RETURN COALESCE((perms -> p_table ->> p_action)::boolean, false);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;`,
    "",
  ];

  const tableActions = new Map<string, Set<string>>();

  for (const perm of permissions) {
    if (!tableActions.has(perm.table_name)) {
      tableActions.set(perm.table_name, new Set());
    }
    const actions = tableActions.get(perm.table_name)!;
    if (perm.can_read) actions.add("read");
    if (perm.can_create) actions.add("create");
    if (perm.can_update) actions.add("update");
    if (perm.can_delete) actions.add("delete");
  }

  for (const [tableName] of tableActions) {
    lines.push(`ALTER TABLE public."${tableName}" ENABLE ROW LEVEL SECURITY;`);
  }

  for (const perm of permissions) {
    const roleName = roleMap.get(perm.role_id) ?? perm.role_id;
    const safeRole = roleName.replace(/[^a-zA-Z0-9_]/g, "_");

    if (perm.can_read) {
      lines.push(`
DROP POLICY IF EXISTS "${POLICY_PREFIX}${safeRole}_${perm.table_name}_select" ON public."${perm.table_name}";
CREATE POLICY "${POLICY_PREFIX}${safeRole}_${perm.table_name}_select"
  ON public."${perm.table_name}" FOR SELECT TO authenticated
  USING (public.supaadmin_has_permission('${perm.table_name}', 'can_read'));`);
    }
    if (perm.can_create) {
      lines.push(`
DROP POLICY IF EXISTS "${POLICY_PREFIX}${safeRole}_${perm.table_name}_insert" ON public."${perm.table_name}";
CREATE POLICY "${POLICY_PREFIX}${safeRole}_${perm.table_name}_insert"
  ON public."${perm.table_name}" FOR INSERT TO authenticated
  WITH CHECK (public.supaadmin_has_permission('${perm.table_name}', 'can_create'));`);
    }
    if (perm.can_update) {
      lines.push(`
DROP POLICY IF EXISTS "${POLICY_PREFIX}${safeRole}_${perm.table_name}_update" ON public."${perm.table_name}";
CREATE POLICY "${POLICY_PREFIX}${safeRole}_${perm.table_name}_update"
  ON public."${perm.table_name}" FOR UPDATE TO authenticated
  USING (public.supaadmin_has_permission('${perm.table_name}', 'can_update'))
  WITH CHECK (public.supaadmin_has_permission('${perm.table_name}', 'can_update'));`);
    }
    if (perm.can_delete) {
      lines.push(`
DROP POLICY IF EXISTS "${POLICY_PREFIX}${safeRole}_${perm.table_name}_delete" ON public."${perm.table_name}";
CREATE POLICY "${POLICY_PREFIX}${safeRole}_${perm.table_name}_delete"
  ON public."${perm.table_name}" FOR DELETE TO authenticated
  USING (public.supaadmin_has_permission('${perm.table_name}', 'can_delete'));`);
    }
  }

  return lines.join("\n");
}
