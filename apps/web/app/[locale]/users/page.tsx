import { getTranslations, setRequestLocale } from "next-intl/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { UsersManager } from "@/components/users/users-manager";
import { redirect } from "@/i18n/routing";
import { getCurrentProfile, requirePlatformAdmin } from "@/lib/permissions";
import { createMetaServerClient } from "@/lib/supabase/meta/server";

export default async function UsersPage({
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

  const supabase = await createMetaServerClient();
  const { data: connections } = await supabase
    .from("connections")
    .select("id, name");

  return (
    <DashboardShell profile={profile} connections={connections ?? []}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("users.title")}</h1>
        <UsersManager />
      </div>
    </DashboardShell>
  );
}
