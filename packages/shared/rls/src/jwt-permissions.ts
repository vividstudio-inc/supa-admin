import "server-only";
import { resolveUserPermissions } from "@supa-admin/auth/permissions";
import type { PlatformRole, TablePermission } from "@supa-admin/projections";

/** JWT app_metadata.permissions shape used by Target RLS policies. */
export async function buildTargetJwtPermissions(
  userId: string,
  connectionId: string,
  platformRole: PlatformRole,
): Promise<{ permissions: Record<string, TablePermission> }> {
  const resolved = await resolveUserPermissions(
    userId,
    connectionId,
    platformRole,
  );

  const permissions: Record<string, TablePermission> = {};
  for (const perm of resolved) {
    permissions[perm.table_name] = {
      can_read: perm.can_read,
      can_create: perm.can_create,
      can_update: perm.can_update,
      can_delete: perm.can_delete,
    };
  }
  return { permissions };
}
