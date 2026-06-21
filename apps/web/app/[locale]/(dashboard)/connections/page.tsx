import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConnectionList } from "@/components/connections/connection-list";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Link, redirect } from "@/i18n/routing";
import { router } from "@/lib/orpc/router";
import { getServerCaller } from "@/lib/orpc/server-caller";
import { requirePlatformAdmin } from "@/lib/permissions";

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
  const { callWithoutInput } = await getServerCaller();
  const { connections } = await callWithoutInput(router.connections.list);

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
