import { getTranslations, setRequestLocale } from "next-intl/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile, getUserConnectionIds } from "@/lib/permissions";
import { createMetaServerClient } from "@/lib/supabase/meta/server";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const profile = await getCurrentProfile();

  if (!profile) return null;

  const connectionIds = await getUserConnectionIds(profile.id, profile.role);
  const supabase = await createMetaServerClient();
  const connectionSource =
    profile.role === "platform_admin" ? "connections" : "connections_member";

  const { data: connections } = await supabase
    .from(connectionSource)
    .select("id, name")
    .in(
      "id",
      connectionIds.length > 0
        ? connectionIds
        : ["00000000-0000-0000-0000-000000000000"],
    );

  const visibleConnections =
    connectionIds.length > 0 ? (connections ?? []) : [];

  return (
    <DashboardShell profile={profile} connections={visibleConnections}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("nav.dashboard")}</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("connections.title")}</CardTitle>
            </CardHeader>
            <CardContent>{visibleConnections.length}</CardContent>
          </Card>
          {profile.role === "platform_admin" && (
            <Card>
              <CardHeader>
                <CardTitle>{t("users.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminUserCount />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

async function AdminUserCount() {
  const supabase = await createMetaServerClient();
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
  return <span>{count ?? 0}</span>;
}
