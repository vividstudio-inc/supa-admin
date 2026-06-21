"use client";

import {
  type BreadcrumbItem,
  PageBreadcrumbs,
} from "@/components/layout/page-breadcrumbs";
import { AppHeaderToolbar } from "@/components/layout/user-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  breadcrumbs?: BreadcrumbItem[];
  email: string;
  displayName?: string | null;
  className?: string;
};

export function AppHeader({
  breadcrumbs = [],
  email,
  displayName,
  className,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-sm",
        className,
      )}
    >
      <SidebarTrigger />
      {breadcrumbs.length > 0 ? (
        <PageBreadcrumbs items={breadcrumbs} className="hidden sm:flex" />
      ) : null}
      <AppHeaderToolbar email={email} displayName={displayName} />
    </header>
  );
}
