"use client";

import { Database, Home, Plug, Shield, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppHeader } from "@/components/layout/app-header";
import { BrandLogo } from "@/components/layout/brand-logo";
import { PageContainer } from "@/components/layout/page-container";
import { useShellExtras } from "@/components/layout/shell-context";
import {
  Sidebar,
  SidebarContent,
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
} from "@/components/ui/sidebar";
import { Link, usePathname } from "@/i18n/routing";
import type { Profile, ResolvedPermission } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  profile: Profile;
  connections: Array<{ id: string; name: string }>;
  children: React.ReactNode;
};

function deriveConnectionId(pathname: string): string | undefined {
  const segments = pathname.split("/").filter(Boolean);
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const candidate = segments[0];
  return candidate && uuidPattern.test(candidate) ? candidate : undefined;
}

function buildBreadcrumbs(
  pathname: string,
  t: ReturnType<typeof useTranslations>,
  connections: Array<{ id: string; name: string }>,
  connectionName?: string,
) {
  const items: Array<{ label: string; href?: string }> = [
    { label: t("nav.dashboard"), href: "/" },
  ];

  if (pathname.startsWith("/connections")) {
    items.push({ label: t("connections.title"), href: "/connections" });
    if (pathname === "/connections/new") {
      items.push({ label: t("connections.add") });
    }
    return items;
  }

  if (pathname.startsWith("/users")) {
    items.push({ label: t("users.title") });
    return items;
  }

  if (pathname.startsWith("/roles")) {
    items.push({ label: t("roles.title") });
    return items;
  }

  const connectionId = deriveConnectionId(pathname);
  if (connectionId) {
    const name =
      connectionName ??
      connections.find((c) => c.id === connectionId)?.name ??
      connectionId;
    items.push({ label: name, href: `/${connectionId}` });

    if (pathname.includes("/setup")) {
      items.push({ label: t("connections.onboarding.title") });
    } else if (pathname.includes("/connect")) {
      items.push({ label: t("connect.title") });
    } else {
      const segments = pathname.split("/").filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      const isConnectionRoot =
        segments.length === 1 && segments[0] === connectionId;
      if (!isConnectionRoot && lastSegment && lastSegment !== connectionId) {
        items.push({ label: lastSegment });
      }
    }
  }

  return items.length > 1 ? items : [];
}

export function DashboardShell({
  profile,
  connections,
  children,
}: DashboardShellProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const { tablePermissions, connectionName } = useShellExtras();
  const isAdmin = profile.role === "platform_admin";
  const activeConnectionId = deriveConnectionId(pathname);
  const breadcrumbs = buildBreadcrumbs(
    pathname,
    t,
    connections,
    connectionName,
  );

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <BrandLogo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t("nav.main")}</SidebarGroupLabel>
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
                {isAdmin ? (
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
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {connections.length > 0 ? (
            <SidebarGroup>
              <SidebarGroupLabel>{t("connections.title")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {connections.map((conn) => (
                    <SidebarMenuItem key={conn.id}>
                      <SidebarMenuButton
                        isActive={activeConnectionId === conn.id}
                        render={<Link href={`/${conn.id}`} />}
                        className={cn(
                          activeConnectionId === conn.id &&
                            "border-l-2 border-brand bg-sidebar-accent",
                        )}
                      >
                        <Database />
                        <span>{conn.name}</span>
                      </SidebarMenuButton>
                      {activeConnectionId === conn.id &&
                      tablePermissions.filter((p) => p.can_read).length > 0 ? (
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              isActive={pathname === `/${conn.id}`}
                              render={<Link href={`/${conn.id}`} />}
                            >
                              <span>{t("connectionTables.title")}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
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
                      ) : null}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="min-h-svh">
        <AppHeader
          breadcrumbs={breadcrumbs}
          email={profile.email}
          displayName={profile.display_name}
        />
        <main className="flex-1 p-4 md:p-6">
          <PageContainer>{children}</PageContainer>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export type { ResolvedPermission };
