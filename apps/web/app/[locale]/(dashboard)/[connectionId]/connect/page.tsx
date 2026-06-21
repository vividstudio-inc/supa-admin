import { getConnectionAnonKey } from "@supa-admin/auth/connection-keys";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConnectForm } from "@/components/connect/connect-form";
import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "@/i18n/routing";
import { getConnectionBootstrapStatus } from "@/lib/connection-bootstrap";
import { getShellProfile } from "@/lib/shell-data";
import { createMetaServerClient } from "@/lib/supabase/meta/server";

export default async function ConnectPage({
  params,
}: {
  params: Promise<{ locale: string; connectionId: string }>;
}) {
  const { locale, connectionId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("connect");

  const profile = await getShellProfile();
  if (!profile) return null;

  const bootstrapStatus = await getConnectionBootstrapStatus(connectionId);
  if (bootstrapStatus !== "ready") {
    redirect({ href: `/${connectionId}/setup`, locale });
  }

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

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title={t("title")} description={connection.name} />
      <ConnectForm
        connectionId={connectionId}
        url={connection.url}
        anonKey={anonKey}
      />
    </div>
  );
}
