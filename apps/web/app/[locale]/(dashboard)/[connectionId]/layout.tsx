import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ShellExtrasRegistrar } from "@/components/layout/shell-context";
import { getUserConnectionIds } from "@/lib/permissions";
import { getShellProfile, getShellTablePermissions } from "@/lib/shell-data";
import { createMetaServerClient } from "@/lib/supabase/meta/server";

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

  const supabase = await createMetaServerClient();
  const connectionSource =
    profile.role === "platform_admin" ? "connections" : "connections_member";
  const { data: connection } = await supabase
    .from(connectionSource)
    .select("id, name")
    .eq("id", connectionId)
    .single();

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
