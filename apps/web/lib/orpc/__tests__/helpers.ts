import { call } from "@orpc/server";
import type { OrpcContext } from "../os";

/** Stable UUIDs for contract validation in handler tests. */
export const TEST_IDS = {
  connection: "00000000-0000-4000-8000-000000000001",
  role: "00000000-0000-4000-8000-000000000002",
  user: "00000000-0000-4000-8000-000000000003",
  targetUser: "00000000-0000-4000-8000-000000000020",
  createdUser: "00000000-0000-4000-8000-000000000010",
} as const;

export const SETUP_SECRET =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

export type AdminCallContext = OrpcContext & {
  profile: { id: string; role: "platform_admin" };
};

export function adminCallContext(
  userId: string = TEST_IDS.user,
): AdminCallContext {
  return {
    actorId: userId,
    profile: { id: userId, role: "platform_admin" },
  };
}

/** oRPC `call` for procedures without input (2nd arg must be `undefined`). */
export function callWithoutInput<TProcedure>(
  procedure: TProcedure,
  options: { context: OrpcContext },
) {
  return call(procedure as Parameters<typeof call>[0], undefined, options);
}

/** oRPC `call` for procedures with input. */
export function callWithInput<TProcedure, TInput>(
  procedure: TProcedure,
  input: TInput,
  options: { context: OrpcContext },
) {
  return call(procedure as Parameters<typeof call>[0], input, options);
}
