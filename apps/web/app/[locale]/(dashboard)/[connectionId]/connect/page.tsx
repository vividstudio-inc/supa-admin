import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConnectForm } from "@/components/connect/connect-form";
import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "@/i18n/routing";
import { router } from "@/lib/orpc/router";
import { getServerCaller } from "@/lib/orpc/server-caller";
import {
  getConnectionBootstrapStatus,
  getShellProfile,
} from "@/lib/shell-data";

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

  const { call } = await getServerCaller();
  const [{ connection }, { anonKey }] = await Promise.all([
    call(router.connections.getAccessible, { id: connectionId }),
    call(router.connections.getAnonKey, { id: connectionId }),
  ]);

  if (!connection) notFound();

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
