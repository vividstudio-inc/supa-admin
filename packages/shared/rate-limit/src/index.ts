import { Ratelimit } from "@upstash/ratelimit";
import { Redis as UpstashRedis } from "@upstash/redis";
import { createClient, type RedisClientType } from "redis";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSec?: number;
};

let localClient: RedisClientType | null = null;
const limiterCache = new Map<string, Ratelimit>();

function isNoOpMode(): boolean {
  return (
    process.env.VITEST === "true" ||
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.RATE_LIMIT_DISABLED === "true"
  );
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

async function getLocalRedis(): Promise<RedisClientType> {
  if (localClient?.isOpen) return localClient;
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is required for local rate limiting");
  }
  localClient = createClient({ url });
  localClient.on("error", () => {
    /* connection errors surface on command */
  });
  await localClient.connect();
  return localClient;
}

function getUpstashLimiter(limit: number, windowSec: number): Ratelimit {
  const cacheKey = `upstash:${limit}:${windowSec}`;
  const cached = limiterCache.get(cacheKey);
  if (cached) return cached as Ratelimit;

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
 * Sliding-window rate limit. No-op in Vitest / when RATE_LIMIT_DISABLED is set.
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
    const limiter = getUpstashLimiter(limit, windowSec);
    const result = await limiter.limit(key);
    if (!result.success) {
      return {
        allowed: false,
        retryAfterSec: Math.max(
          1,
          Math.ceil((result.reset - Date.now()) / 1000),
        ),
      };
    }
    return { allowed: true };
  }

  return checkLocalRateLimit(key, limit, windowSec);
}

/** Reset cached clients — test helper. */
export async function resetRateLimitClients(): Promise<void> {
  limiterCache.clear();
  if (localClient?.isOpen) {
    await localClient.quit();
  }
  localClient = null;
}
