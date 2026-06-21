import { Ratelimit } from "@upstash/ratelimit";
import { Redis as UpstashRedis } from "@upstash/redis";
import type { RateLimitResult } from "./types";

const limiterCache = new Map<string, Ratelimit>();

export function isNoOpMode(): boolean {
  return (
    process.env.VITEST === "true" ||
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.RATE_LIMIT_DISABLED === "true"
  );
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function hasUpstashConfig(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getUpstashLimiter(limit: number, windowSec: number): Ratelimit {
  const cacheKey = `upstash:${limit}:${windowSec}`;
  const cached = limiterCache.get(cacheKey);
  if (cached) return cached;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production",
    );
  }

  const limiter = new Ratelimit({
    redis: new UpstashRedis({ url, token }),
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    prefix: "sa-rl",
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

export async function checkUpstashRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter(limit, windowSec);
  const result = await limiter.limit(key);
  if (!result.success) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  }
  return { allowed: true };
}

export function clearUpstashLimiterCache(): void {
  limiterCache.clear();
}
