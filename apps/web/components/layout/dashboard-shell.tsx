"use client";

import { Database, Home, Plug, Shield, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { LogoutButton } from "@/components/auth/logout-button";
import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/routing";
import type { Profile, ResolvedPermission } from "@/lib/types/database";

type DashboardShellProps = {
  profile: Profile;
  connections: Array<{ id: string; name: string }>;
  activeConnectionId?: string;
  tablePermissions?: ResolvedPermission[];
  children: React.ReactNode;
};

export function DashboardShell({
  profile,
  connections,
  activeConnectionId,
  tablePermissions = [],
  children,
}: DashboardShellProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const isAdmin = profile.role === "platform_admin";

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <div className="font-semibold text-lg">{t("common.appName")}</div>
          <div className="text-xs text-muted-foreground truncate">
            {profile.email}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t("nav.dashboard")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname === "/"}
                    render={<Link href="/" />}
                  >
                    <Home />
                    <span>{t("nav.dashboard")}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {isAdmin && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={pathname.startsWith("/connections")}
                        render={<Link href="/connections" />}
                      >
                        <Plug />
                        <span>{t("nav.connections")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={pathname.startsWith("/users")}
                        render={<Link href="/users" />}
                      >
                        <Users />
                        <span>{t("nav.users")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={pathname.startsWith("/roles")}
                        render={<Link href="/roles" />}
                      >
                        <Shield />
                        <span>{t("nav.roles")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {connections.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>{t("connections.title")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {connections.map((conn) => (
                    <SidebarMenuItem key={conn.id}>
                      <SidebarMenuButton
                        isActive={activeConnectionId === conn.id}
                        render={<Link href={`/${conn.id}/connect`} />}
                      >
                        <Database />
                        <span>{conn.name}</span>
                      </SidebarMenuButton>
                      {activeConnectionId === conn.id &&
                        tablePermissions.filter((p) => p.can_read).length >
                          0 && (
                          <SidebarMenuSub>
                            {tablePermissions
                              .filter((p) => p.can_read)
                              .map((perm) => (
                                <SidebarMenuSubItem key={perm.table_name}>
                                  <SidebarMenuSubButton
                                    isActive={pathname.includes(
                                      `/${perm.table_name}`,
                                    )}
                                    render={
                                      <Link
                                        href={`/${conn.id}/${perm.table_name}`}
                                      />
                                    }
                                  >
                                    <span>{perm.table_name}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                          </SidebarMenuSub>
                        )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
        <SidebarFooter className="p-2 flex flex-col gap-2">
          <LocaleSwitcher />
          <LogoutButton />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
