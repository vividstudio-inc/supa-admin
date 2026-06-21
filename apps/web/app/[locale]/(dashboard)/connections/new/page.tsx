import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConnectionForm } from "@/components/connections/connection-form";
import { PageHeader } from "@/components/layout/page-header";
import { redirect } from "@/i18n/routing";
import { requirePlatformAdmin } from "@/lib/permissions";

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

  const t = await getTranslations();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title={t("connections.add")}
        description={t("connections.formDescription")}
      />
      <ConnectionForm />
    </div>
  );
}
