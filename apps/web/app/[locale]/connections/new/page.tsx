import { setRequestLocale } from "next-intl/server";
import { ConnectionForm } from "@/components/connections/connection-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { redirect } from "@/i18n/routing";
import { getCurrentProfile, requirePlatformAdmin } from "@/lib/permissions";
import { createMetaServerClient } from "@/lib/supabase/meta/server";

export default async function NewConnectionPage({
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

  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createMetaServerClient();
  const { data: connections } = await supabase
    .from("connections")
    .select("id, name");

  return (
    <DashboardShell profile={profile} connections={connections ?? []}>
      <ConnectionForm />
    </DashboardShell>
  );
}
