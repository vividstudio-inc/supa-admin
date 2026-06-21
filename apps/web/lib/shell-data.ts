import { cache } from "react";
import {
  getCurrentProfile,
  getUserConnectionIds,
  resolveUserPermissions,
} from "@/lib/permissions";
import { createMetaServerClient } from "@/lib/supabase/meta/server";
import type { Profile, ResolvedPermission } from "@/lib/types/database";

export const getShellProfile = cache(async (): Promise<Profile | null> => {
  return getCurrentProfile();
});

export const getShellConnections = cache(
  async (): Promise<Array<{ id: string; name: string }>> => {
    const profile = await getShellProfile();
    if (!profile) return [];

    const connectionIds = await getUserConnectionIds(profile.id, profile.role);
    if (connectionIds.length === 0) return [];

    const supabase = await createMetaServerClient();
    const connectionSource =
      profile.role === "platform_admin" ? "connections" : "connections_member";

    const { data: connections } = await supabase
      .from(connectionSource)
      .select("id, name")
      .in("id", connectionIds)
      .order("name");

    return connections ?? [];
  },
);

export async function getShellTablePermissions(
  connectionId: string,
): Promise<ResolvedPermission[]> {
  const profile = await getShellProfile();
  if (!profile) return [];
  return resolveUserPermissions(profile.id, connectionId, profile.role);
}
