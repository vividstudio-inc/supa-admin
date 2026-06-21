import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConnectionList } from "@/components/connections/connection-list";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/routing";
import { requirePlatformAdmin } from "@/lib/permissions";
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
  const supabase = await createMetaServerClient();
  const { data: connections } = await supabase
    .from("connections")
    .select("id, name, url, schema_cached_at, bootstrap_status")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("connections.title")}
        description={t("connections.listDescription")}
        actions={
          <Link href="/connections/new">
            <Button>{t("connections.add")}</Button>
          </Link>
        }
      />
      <ConnectionList connections={connections ?? []} />
    </div>
  );
}
