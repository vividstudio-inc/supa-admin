"use client";

import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "@/i18n/routing";

type ForeignKeyResyncBannerProps = {
  connectionId: string;
  show: boolean;
};

export function ForeignKeyResyncBanner({
  connectionId,
  show,
}: ForeignKeyResyncBannerProps) {
  const t = useTranslations();

  if (!show) return null;

  return (
    <Alert>
      <AlertTitle>{t("table.resyncSchemaForFkTitle")}</AlertTitle>
      <AlertDescription>
        {t("table.resyncSchemaForFk")}{" "}
        <Link
          href={`/${connectionId}`}
          className="underline underline-offset-4"
        >
          {t("connections.syncSchema")}
        </Link>
      </AlertDescription>
    </Alert>
  );
}
