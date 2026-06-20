import "server-only";
import { decrypt } from "@supa-admin/crypto";
import { createMetaServiceClient } from "./meta-server";

export async function getConnectionAnonKey(
  connectionId: string,
  actorId: string,
): Promise<string | null> {
  const service = createMetaServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", actorId)
    .single();

  if (!profile) return null;

  if (profile.role !== "platform_admin") {
    const { data: membership } = await service
      .from("connection_members")
      .select("id")
      .eq("user_id", actorId)
      .eq("connection_id", connectionId)
      .maybeSingle();

    if (!membership) return null;
  }

  const { data: connection } = await service
    .from("connections")
    .select("anon_key_enc")
    .eq("id", connectionId)
    .single();

  if (!connection?.anon_key_enc) return null;

  return decrypt(connection.anon_key_enc);
}
