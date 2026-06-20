import { createMetaServerClient } from "@supa-admin/auth/server";
import type { OrpcContext } from "./os";

export async function createOrpcContextFromRequest(
  _request: Request,
): Promise<OrpcContext> {
  const supabase = await createMetaServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { actorId: user?.id ?? null };
}
