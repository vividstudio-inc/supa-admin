import "server-only";
import { cache } from "react";
import { router } from "@/lib/orpc/router";
import { getServerCaller } from "@/lib/orpc/server-caller";
import { resolveUserPermissions } from "@/lib/permissions";
import type {
  BootstrapStatus,
  Profile,
  ResolvedPermission,
} from "@/lib/types/database";

export const getShellProfile = cache(async (): Promise<Profile | null> => {
  try {
    const { callWithoutInput } = await getServerCaller();
    const { profile } = await callWithoutInput(router.app.shell);
    return profile as Profile;
  } catch {
    return null;
  }
});

export const getShellConnections = cache(
  async (): Promise<Array<{ id: string; name: string }>> => {
    try {
      const { callWithoutInput } = await getServerCaller();
      const { connections } = await callWithoutInput(router.app.shell);
      return connections;
    } catch {
      return [];
    }
  },
);

export async function getShellTablePermissions(
  connectionId: string,
): Promise<ResolvedPermission[]> {
  const profile = await getShellProfile();
  if (!profile) return [];
  return resolveUserPermissions(profile.id, connectionId, profile.role);
}

export async function getConnectionBootstrapStatus(
  connectionId: string,
): Promise<BootstrapStatus | null> {
  try {
    const { call } = await getServerCaller();
    const { connection } = await call(router.connections.getAccessible, {
      id: connectionId,
    });
    return connection.bootstrap_status;
  } catch {
    return null;
  }
}
