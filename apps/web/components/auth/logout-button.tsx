"use client";

import { clearAllTargetSessions } from "@supa-admin/supabase-target/clear-sessions";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { createMetaBrowserClient } from "@/lib/supabase/meta/client";

export function LogoutButton() {
  const router = useRouter();
  const t = useTranslations("auth");

  async function handleLogout() {
    const supabase = createMetaBrowserClient();
    await supabase.auth.signOut();
    clearAllTargetSessions();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout}>
      {t("logout")}
    </Button>
  );
}
