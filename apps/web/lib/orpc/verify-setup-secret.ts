import { timingSafeEqual } from "node:crypto";
import { ORPCError } from "@orpc/server";

export function verifySetupSecret(
  provided: string,
  expectedSecret: string,
): void {
  const expected = Buffer.from(expectedSecret);
  const actual = Buffer.from(provided);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new ORPCError("FORBIDDEN", { message: "Invalid setup secret" });
  }
}
