"use client";

import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/layout/brand-logo";

export function AuthBrandPanel() {
  const t = useTranslations("authLayout");

  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-card p-10 lg:flex lg:w-1/2">
      <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-transparent" />
      <div className="relative">
        <BrandLogo />
      </div>
      <div className="relative space-y-4">
        <h2 className="text-3xl font-semibold tracking-tight">
          {t("tagline")}
        </h2>
        <p className="max-w-md text-muted-foreground">{t("description")}</p>
      </div>
      <p className="relative text-xs text-muted-foreground">{t("footer")}</p>
    </div>
  );
}
