import { getConnectionAnonKey } from "@supa-admin/auth/connection-keys";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ConnectForm } from "@/components/connect/connect-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  getCurrentProfile,
  getUserConnectionIds,
  resolveUserPermissions,
} from "@/lib/permissions";
import { createMetaServerClient } from "@/lib/supabase/meta/server";

export default async function ConnectPage({
  params,
}: {
  params: Promise<{ locale: string; connectionId: string }>;
}) {
  const { locale, connectionId } = await params;
  setRequestLocale(locale);

  const profile = await getCurrentProfile();
  if (!profile) return null;

  const allowedIds = await getUserConnectionIds(profile.id, profile.role);
  if (!allowedIds.includes(connectionId)) notFound();

  const supabase = await createMetaServerClient();
  const connectionSource =
    profile.role === "platform_admin" ? "connections" : "connections_member";
  const { data: connection } = await supabase
    .from(connectionSource)
    .select("id, name, url")
    .eq("id", connectionId)
    .single();

  if (!connection) notFound();

  const anonKey = await getConnectionAnonKey(connectionId, profile.id);
  if (!anonKey) notFound();

  const { data: connections } = await supabase
    .from(connectionSource)
    .select("id, name");
  const permissions = await resolveUserPermissions(
    profile.id,
    connectionId,
    profile.role,
  );

  return (
    <DashboardShell
      profile={profile}
      connections={connections ?? []}
      activeConnectionId={connectionId}
      tablePermissions={permissions}
    >
      <ConnectForm
        connectionId={connectionId}
        url={connection.url}
        anonKey={anonKey}
      />
    </DashboardShell>
  );
}
