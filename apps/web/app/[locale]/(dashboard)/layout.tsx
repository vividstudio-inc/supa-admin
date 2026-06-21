import { setRequestLocale } from "next-intl/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ShellExtrasRoot } from "@/components/layout/shell-context";
import { redirect } from "@/i18n/routing";
import { getShellConnections, getShellProfile } from "@/lib/shell-data";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const profile = await getShellProfile();
  if (!profile) {
    redirect({ href: "/login", locale });
  }

  const connections = await getShellConnections();

  return (
    <ShellExtrasRoot>
      <DashboardShell
        profile={profile as NonNullable<typeof profile>}
        connections={connections}
      >
        {children}
      </DashboardShell>
    </ShellExtrasRoot>
  );
}
