import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConnectionList } from "@/components/connections/connection-list";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/routing";
import {
  getCurrentProfile,
  getUserConnectionIds,
  requirePlatformAdmin,
} from "@/lib/permissions";
import { createMetaServerClient } from "@/lib/supabase/meta/server";

export default async function ConnectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  try {
    await requirePlatformAdmin();
  } catch {
    redirect({ href: "/", locale });
  }

  const t = await getTranslations();
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const _connectionIds = await getUserConnectionIds(profile.id, profile.role);
  const supabase = await createMetaServerClient();
  const { data: connections } = await supabase
    .from("connections")
    .select("id, name, url, schema_cached_at")
    .order("created_at", { ascending: false });

  return (
    <DashboardShell profile={profile} connections={connections ?? []}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("connections.title")}</h1>
          <Link href="/connections/new">
            <Button>{t("connections.add")}</Button>
          </Link>
        </div>
        <ConnectionList connections={connections ?? []} />
      </div>
    </DashboardShell>
  );
}
