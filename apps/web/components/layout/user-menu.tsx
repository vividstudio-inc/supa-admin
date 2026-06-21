"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/routing";
import { createMetaBrowserClient } from "@/lib/supabase/meta/client";

type UserMenuProps = {
  email: string;
  displayName?: string | null;
};

export function UserMenu({ email, displayName }: UserMenuProps) {
  const t = useTranslations();
  const router = useRouter();
  const initials = (displayName ?? email).slice(0, 2).toUpperCase();

  async function handleLogout() {
    const supabase = createMetaBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full"
            aria-label={t("auth.logout")}
          />
        }
      >
        <Avatar size="sm">
          <AvatarFallback className="bg-brand/20 text-brand text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-0.5">
              {displayName ? (
                <span className="text-sm font-medium">{displayName}</span>
              ) : null}
              <span className="truncate text-xs text-muted-foreground">
                {email}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <LocaleSwitcher />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="size-4" />
          {t("auth.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppHeaderToolbar({
  email,
  displayName,
}: {
  email: string;
  displayName?: string | null;
}) {
  return (
    <div className="ml-auto flex items-center gap-1">
      <ThemeToggle />
      <UserMenu email={email} displayName={displayName} />
    </div>
  );
}
