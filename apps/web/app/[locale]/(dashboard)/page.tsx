import { Plug } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/patterns/empty-state";
import { MetricCard } from "@/components/patterns/metric-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { getShellConnections, getShellProfile } from "@/lib/shell-data";
import { createMetaServerClient } from "@/lib/supabase/meta/server";

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
              value={<AdminUserCount />}
              hint={t("dashboard.usersHint")}
            />
            <MetricCard
              label={t("roles.title")}
              value={<RoleCount />}
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

async function AdminUserCount() {
  const supabase = await createMetaServerClient();
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
  return <span>{count ?? 0}</span>;
}

async function RoleCount() {
  const supabase = await createMetaServerClient();
  const { count } = await supabase
    .from("roles")
    .select("*", { count: "exact", head: true });
  return <span>{count ?? 0}</span>;
}
