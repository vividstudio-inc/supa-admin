import { getConnectionOnboardingStatus } from "@supa-admin/rls";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConnectionTableList } from "@/components/connections/connection-table-list";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/routing";
import { router } from "@/lib/orpc/router";
import { getServerCaller } from "@/lib/orpc/server-caller";
import { requirePlatformAdmin } from "@/lib/permissions";
import {
  getConnectionBootstrapStatus,
  getShellProfile,
  getShellTablePermissions,
} from "@/lib/shell-data";

export default async function ConnectionTablesPage({
  params,
}: {
  params: Promise<{ locale: string; connectionId: string }>;
}) {
  const { locale, connectionId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("connectionTables");

  const profile = await getShellProfile();
  if (!profile) return null;

  const bootstrapStatus = await getConnectionBootstrapStatus(connectionId);
  if (bootstrapStatus !== "ready") {
    redirect({ href: `/${connectionId}/setup`, locale });
  }

  if (profile.role === "platform_admin") {
    const onboarding = await getConnectionOnboardingStatus(connectionId);
    if (!onboarding.complete) {
      redirect({ href: `/${connectionId}/setup`, locale });
    }
  }

  const { call } = await getServerCaller();
  const { connection } = await call(router.connections.getAccessible, {
    id: connectionId,
  });

  if (!connection) notFound();

  const permissions = await getShellTablePermissions(connectionId);
  const readableTables = permissions.filter((p) => p.can_read);

  let isAdmin = false;
  try {
    await requirePlatformAdmin();
    isAdmin = true;
  } catch {
    isAdmin = false;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={connection.name}
        description={t("description")}
        actions={
          <Button
            variant="outline"
            render={<Link href={`/${connectionId}/connect`} />}
          >
            {t("openConnect")}
          </Button>
        }
      />
      <ConnectionTableList
        connectionId={connectionId}
        tables={readableTables}
      />
      {isAdmin && readableTables.length > 0 ? (
        <p className="text-sm text-muted-foreground">{t("adminHint")}</p>
      ) : null}
    </div>
  );
}
