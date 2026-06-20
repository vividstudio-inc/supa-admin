import { notFound } from "next/navigation";
import { redirect } from "@/i18n/routing";
import {
  getCurrentProfile,
  getUserConnectionIds,
  resolveUserPermissions,
} from "@/lib/permissions";

export default async function ConnectionIndexPage({
  params,
}: {
  params: Promise<{ locale: string; connectionId: string }>;
}) {
  const { locale, connectionId } = await params;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const allowedIds = await getUserConnectionIds(profile.id, profile.role);
  if (!allowedIds.includes(connectionId)) notFound();

  const permissions = await resolveUserPermissions(
    profile.id,
    connectionId,
    profile.role,
  );
  const firstTable = permissions.find((p) => p.can_read);

  if (firstTable) {
    redirect({ href: `/${connectionId}/${firstTable.table_name}`, locale });
  }

  redirect({ href: `/${connectionId}/connect`, locale });
}
