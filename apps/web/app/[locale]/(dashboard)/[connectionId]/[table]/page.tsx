import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DataTableCrud } from "@/components/data-table/data-table-crud";
import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "@/i18n/routing";
import { router } from "@/lib/orpc/router";
import { getServerCaller } from "@/lib/orpc/server-caller";
import { canAccessTable } from "@/lib/permissions";
import {
  getConnectionBootstrapStatus,
  getShellProfile,
  getShellTablePermissions,
} from "@/lib/shell-data";
import type { ColumnMeta } from "@/lib/types/database";

export default async function TablePage({
  params,
}: {
  params: Promise<{ locale: string; connectionId: string; table: string }>;
}) {
  const { locale, connectionId, table } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  const profile = await getShellProfile();
  if (!profile) return null;

  const bootstrapStatus = await getConnectionBootstrapStatus(connectionId);
  if (bootstrapStatus !== "ready") {
    redirect({ href: `/${connectionId}/setup`, locale });
  }

  const canRead = await canAccessTable(
    profile.id,
    connectionId,
    table,
    "can_read",
    profile.role,
  );
  if (!canRead) notFound();

  const { call } = await getServerCaller();
  const [{ connection, tables }, { anonKey }] = await Promise.all([
    call(router.connections.getAccessible, { id: connectionId }),
    call(router.connections.getAnonKey, { id: connectionId }),
  ]);

  if (!connection) notFound();

  const tableMeta = tables.find(
    (row: { table_name: string }) => row.table_name === table,
  );
  if (!tableMeta) notFound();

  const permissions = await getShellTablePermissions(connectionId);
  const tablePerm = permissions.find((p) => p.table_name === table) ?? {
    can_read: false,
    can_create: false,
    can_update: false,
    can_delete: false,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={table}
        description={t("table.pageDescription", {
          connection: connection.name,
        })}
      />
      <DataTableCrud
        connectionId={connectionId}
        tableName={table}
        url={connection.url}
        anonKey={anonKey}
        columns={tableMeta.columns as ColumnMeta[]}
        permissions={tablePerm}
      />
    </div>
  );
}
