import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ShellExtrasRegistrar } from "@/components/layout/shell-context";
import { router } from "@/lib/orpc/router";
import { getServerCaller } from "@/lib/orpc/server-caller";
import { getUserConnectionIds } from "@/lib/permissions";
import { getShellProfile, getShellTablePermissions } from "@/lib/shell-data";

export default async function ConnectionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; connectionId: string }>;
}) {
  const { locale, connectionId } = await params;
  setRequestLocale(locale);

  const profile = await getShellProfile();
  if (!profile) notFound();

  const allowedIds = await getUserConnectionIds(profile.id, profile.role);
  if (!allowedIds.includes(connectionId)) notFound();

  const { call } = await getServerCaller();
  const { connection } = await call(router.connections.getAccessible, {
    id: connectionId,
  });

  if (!connection) notFound();

  const tablePermissions = await getShellTablePermissions(connectionId);

  return (
    <ShellExtrasRegistrar
      tablePermissions={tablePermissions}
      connectionName={connection.name}
    >
      {children}
    </ShellExtrasRegistrar>
  );
}
