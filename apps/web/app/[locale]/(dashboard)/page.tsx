import { Plug } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { MetricCard } from "@/components/patterns/metric-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { router } from "@/lib/orpc/router";
import { getServerCaller } from "@/lib/orpc/server-caller";
import { getShellConnections, getShellProfile } from "@/lib/shell-data";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const profile = await getShellProfile();
  if (!profile) return null;

  const visibleConnections = await getShellConnections();
  const isAdmin = profile.role === "platform_admin";

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("dashboard.welcome", {
          name: profile.display_name ?? profile.email,
        })}
        description={t("dashboard.subtitle")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label={t("connections.title")}
          value={visibleConnections.length}
          hint={t("dashboard.connectionsHint")}
        />
        {isAdmin ? (
          <>
            <MetricCard
              label={t("users.title")}
              value={<AdminStats />}
              hint={t("dashboard.usersHint")}
            />
            <MetricCard
              label={t("roles.title")}
              value={<AdminStats field="roleCount" />}
              hint={t("dashboard.rolesHint")}
            />
          </>
        ) : null}
      </div>

      {visibleConnections.length === 0 ? (
        <EmptyState
          icon={Plug}
          title={t("dashboard.noConnectionsTitle")}
          description={t("dashboard.noConnectionsDescription")}
          action={
            isAdmin ? (
              <Link href="/connections/new">
                <Button>{t("connections.add")}</Button>
              </Link>
            ) : undefined
          }
        />
      ) : null}
    </div>
  );
}

async function AdminStats({
  field = "userCount",
}: {
  field?: "userCount" | "roleCount";
}) {
  const { callWithoutInput } = await getServerCaller();
  const stats = await callWithoutInput(router.dashboard.stats);
  return (
    <span>{field === "userCount" ? stats.userCount : stats.roleCount}</span>
  );
}
