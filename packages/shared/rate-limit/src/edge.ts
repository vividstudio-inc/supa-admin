import type { RateLimitResult } from "./types";
import {
  checkUpstashRateLimit,
  hasUpstashConfig,
  isNoOpMode,
  isProduction,
} from "./upstash";

/**
 * Edge-safe rate limit (middleware). Uses Upstash REST only — never the Node `redis` package.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  if (isNoOpMode()) {
    return { allowed: true };
  }

  if (isProduction() || hasUpstashConfig()) {
    return checkUpstashRateLimit(key, limit, windowSec);
  }

  // Local dev: Node route handlers still rate-limit via @supa-admin/rate-limit (Redis).
  return { allowed: true };
}

export type { RateLimitResult } from "./types";
