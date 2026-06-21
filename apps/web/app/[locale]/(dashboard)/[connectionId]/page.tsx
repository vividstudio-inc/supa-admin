import { getConnectionOnboardingStatus } from "@supa-admin/rls";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConnectionTableList } from "@/components/connections/connection-table-list";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/routing";
import { getConnectionBootstrapStatus } from "@/lib/connection-bootstrap";
import { requirePlatformAdmin } from "@/lib/permissions";
import { getShellProfile, getShellTablePermissions } from "@/lib/shell-data";
import { createMetaServerClient } from "@/lib/supabase/meta/server";

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

  const supabase = await createMetaServerClient();
  const connectionSource =
    profile.role === "platform_admin" ? "connections" : "connections_member";
  const { data: connection } = await supabase
    .from(connectionSource)
    .select("id, name")
    .eq("id", connectionId)
    .single();

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
