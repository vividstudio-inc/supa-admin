import "server-only";
import { createMetaServerClient } from "@supa-admin/auth/server";
import type { OrpcContext } from "./os";

function resolveClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function createOrpcContextFromRequest(
  request: Request,
): Promise<OrpcContext> {
  const supabase = await createMetaServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return {
    actorId: user?.id ?? null,
    clientIp: resolveClientIp(request),
  };
}

/** @deprecated Use createOrpcContextFromRequest — kept for naming clarity in RSC callers. */
export const createOrpcContextFromHeaders = createOrpcContextFromRequest;
