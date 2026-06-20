import "server-only";
import { decrypt } from "@supa-admin/crypto";
import { createClient } from "@supabase/supabase-js";

export function createTargetAdminClient(url: string, serviceRoleEnc: string) {
  const serviceRoleKey = decrypt(serviceRoleEnc);
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function createTargetAnonClient(url: string, anonKeyEnc: string) {
  const anonKey = decrypt(anonKeyEnc);
  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
