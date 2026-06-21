import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/layout/page-header";
import { RolesManager } from "@/components/roles/roles-manager";
import { redirect } from "@/i18n/routing";
import { requirePlatformAdmin } from "@/lib/permissions";

export default async function RolesPage({
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("roles.title")}
        description={t("roles.pageDescription")}
      />
      <RolesManager />
    </div>
  );
}
