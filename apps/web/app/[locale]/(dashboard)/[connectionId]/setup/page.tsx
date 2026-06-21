import { getConnectionOnboardingStatus } from "@supa-admin/rls";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConnectionOnboardingWizard } from "@/components/connections/connection-onboarding-wizard";
import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "@/i18n/routing";
import { router } from "@/lib/orpc/router";
import { getServerCaller } from "@/lib/orpc/server-caller";
import { requirePlatformAdmin } from "@/lib/permissions";
import {
  getConnectionBootstrapStatus,
  getShellProfile,
} from "@/lib/shell-data";

export default async function TargetSetupPage({
  params,
}: {
  params: Promise<{ locale: string; connectionId: string }>;
}) {
  const { locale, connectionId } = await params;
  setRequestLocale(locale);

  const profile = await getShellProfile();
  if (!profile) return null;

  const bootstrapStatus = await getConnectionBootstrapStatus(connectionId);
  const t = await getTranslations();

  const { call } = await getServerCaller();
  const { connection } = await call(router.connections.getAccessible, {
    id: connectionId,
  });

  if (!connection) notFound();

  let isAdmin = false;
  try {
    await requirePlatformAdmin();
    isAdmin = true;
  } catch {
    isAdmin = false;
  }

  if (bootstrapStatus !== "ready" && !isAdmin) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title={t("connections.bootstrap.title")}
          description={t("connections.bootstrap.blockedDescription", {
            name: connection.name,
          })}
        />
        <p className="text-sm text-muted-foreground">
          {t("connections.bootstrap.contactAdmin")}
        </p>
      </div>
    );
  }

  if (bootstrapStatus === "ready") {
    const onboarding = await getConnectionOnboardingStatus(connectionId);
    if (onboarding.complete) {
      redirect({ href: `/${connectionId}`, locale });
    }
  }

  if (!isAdmin) {
    notFound();
  }

  const onboarding = await getConnectionOnboardingStatus(connectionId);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("connections.onboarding.title")}
        description={t("connections.onboarding.description", {
          name: connection.name,
        })}
      />
      <ConnectionOnboardingWizard
        connectionId={connectionId}
        connectionName={connection.name}
        steps={onboarding.steps}
        showBootstrap={bootstrapStatus !== "ready"}
      />
    </div>
  );
}
