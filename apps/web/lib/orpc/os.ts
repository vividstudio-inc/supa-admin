import { implement, ORPCError } from "@orpc/server";
import { contract } from "@supa-admin/orpc-contract";

export type OrpcContext = {
  actorId: string | null;
  clientIp: string;
};

export type AuthenticatedContext = OrpcContext & {
  profile: NonNullable<
    Awaited<
      ReturnType<
        typeof import("@supa-admin/auth/permissions").getCurrentProfile
      >
    >
  >;
};

export const os = implement(contract).$context<OrpcContext>();

export const withAuth = os.middleware(async ({ context, next }) => {
  if (context.actorId === null) {
    throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
  }
  const { getCurrentProfile } = await import("@supa-admin/auth/permissions");
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
  }
  return next({
    context: { ...context, profile } satisfies AuthenticatedContext,
  });
});

export const withAdmin = os.middleware(async ({ context, next }) => {
  if (context.actorId === null) {
    throw new ORPCError("UNAUTHORIZED", { message: "Unauthorized" });
  }
  const { getCurrentProfile } = await import("@supa-admin/auth/permissions");
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "platform_admin") {
    throw new ORPCError("FORBIDDEN", { message: "Forbidden" });
  }
  return next({ context: { ...context, profile } });
});
