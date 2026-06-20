import { getConnectionAnonKey } from "@supa-admin/auth/connection-keys";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { DataTableCrud } from "@/components/data-table/data-table-crud";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import {
  canAccessTable,
  getCurrentProfile,
  getUserConnectionIds,
  resolveUserPermissions,
} from "@/lib/permissions";
import { createMetaServerClient } from "@/lib/supabase/meta/server";
import type { ColumnMeta } from "@/lib/types/database";

export default async function TablePage({
  params,
}: {
  params: Promise<{ locale: string; connectionId: string; table: string }>;
}) {
  const { locale, connectionId, table } = await params;
  setRequestLocale(locale);

  const profile = await getCurrentProfile();
  if (!profile) return null;

  const allowedIds = await getUserConnectionIds(profile.id, profile.role);
  if (!allowedIds.includes(connectionId)) notFound();

  const canRead = await canAccessTable(
    profile.id,
    connectionId,
    table,
    "can_read",
    profile.role,
  );
  if (!canRead) notFound();

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

  const { data: tableMeta } = await supabase
    .from("connection_tables")
    .select("columns")
    .eq("connection_id", connectionId)
    .eq("table_name", table)
    .single();

  if (!tableMeta) notFound();

  const permissions = await resolveUserPermissions(
    profile.id,
    connectionId,
    profile.role,
  );
  const tablePerm = permissions.find((p) => p.table_name === table) ?? {
    can_read: true,
    can_create: profile.role === "platform_admin",
    can_update: profile.role === "platform_admin",
    can_delete: profile.role === "platform_admin",
  };

  const { data: connections } = await supabase
    .from(connectionSource)
    .select("id, name");

  return (
    <DashboardShell
      profile={profile}
      connections={connections ?? []}
      activeConnectionId={connectionId}
      tablePermissions={permissions}
    >
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{table}</h1>
        <DataTableCrud
          connectionId={connectionId}
          tableName={table}
          url={connection.url}
          anonKey={anonKey}
          columns={tableMeta.columns as ColumnMeta[]}
          permissions={tablePerm}
        />
      </div>
    </DashboardShell>
  );
}
