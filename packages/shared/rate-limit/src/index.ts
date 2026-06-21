import type { RedisClientType } from "redis";
import type { RateLimitResult } from "./types";
import {
  checkUpstashRateLimit,
  clearUpstashLimiterCache,
  isNoOpMode,
  isProduction,
} from "./upstash";

export type { RateLimitResult } from "./types";

let localClient: RedisClientType | null = null;

async function getLocalRedis(): Promise<RedisClientType> {
  if (localClient?.isOpen) return localClient;
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is required for local rate limiting");
  }
  const { createClient } = await import("redis");
  localClient = createClient({ url });
  localClient.on("error", () => {
    /* connection errors surface on command */
  });
  await localClient.connect();
  return localClient;
}

async function checkLocalRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const client = await getLocalRedis();
  const bucket = `sa-rl:${key}:${Math.floor(Date.now() / (windowSec * 1000))}`;
  const count = await client.incr(bucket);
  if (count === 1) {
    await client.expire(bucket, windowSec);
  }
  if (count > limit) {
    const ttl = await client.ttl(bucket);
    return { allowed: false, retryAfterSec: ttl > 0 ? ttl : windowSec };
  }
  return { allowed: true };
}

/**
 * Sliding-window rate limit for Node.js runtimes (oRPC, webhooks).
 * No-op in Vitest / when RATE_LIMIT_DISABLED is set.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  if (isNoOpMode()) {
    return { allowed: true };
  }

  if (isProduction()) {
    return checkUpstashRateLimit(key, limit, windowSec);
  }

  return checkLocalRateLimit(key, limit, windowSec);
}

/** Reset cached clients — test helper. */
export async function resetRateLimitClients(): Promise<void> {
  clearUpstashLimiterCache();
  if (localClient?.isOpen) {
    await localClient.quit();
  }
  localClient = null;
}
