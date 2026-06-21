import { beforeEach, describe, expect, it, vi } from "vitest";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VITEST", "true");
  });

  it("when vitest env, then allows all requests (no-op)", async () => {
    const { checkRateLimit } = await import("../src/index.js");
    const result = await checkRateLimit("test-key", 1, 60);
    expect(result.allowed).toBe(true);
  });

  it("when RATE_LIMIT_DISABLED, then allows all requests", async () => {
    vi.stubEnv("VITEST", "");
    vi.stubEnv("RATE_LIMIT_DISABLED", "true");
    const { checkRateLimit } = await import("../src/index.js");
    const result = await checkRateLimit("test-key", 1, 60);
    expect(result.allowed).toBe(true);
  });

  it("when local redis under limit, then allows request", async () => {
    vi.resetModules();
    vi.stubEnv("VITEST", "");
    vi.stubEnv("SKIP_ENV_VALIDATION", "");
    vi.stubEnv("RATE_LIMIT_DISABLED", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");

    const incr = vi.fn().mockResolvedValue(1);
    const expire = vi.fn().mockResolvedValue(1);
    const ttl = vi.fn().mockResolvedValue(60);
    const connect = vi.fn().mockResolvedValue(undefined);
    const on = vi.fn();

    vi.doMock("redis", () => ({
      createClient: vi.fn(() => ({
        isOpen: true,
        connect,
        on,
        incr,
        expire,
        ttl,
        quit: vi.fn(),
      })),
    }));

    const { checkRateLimit, resetRateLimitClients } = await import(
      "../src/index.js"
    );
    const result = await checkRateLimit("local-key", 5, 60);
    expect(result.allowed).toBe(true);
    await resetRateLimitClients();
  });

  it("when production upstash denies, then returns retryAfterSec", async () => {
    vi.resetModules();
    vi.stubEnv("VITEST", "");
    vi.stubEnv("SKIP_ENV_VALIDATION", "");
    vi.stubEnv("RATE_LIMIT_DISABLED", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");

    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: class {
        static slidingWindow = vi.fn(() => ({}));
        limit = vi.fn().mockResolvedValue({
          success: false,
          reset: Date.now() + 5000,
        });
      },
    }));
    vi.doMock("@upstash/redis", () => ({
      Redis: class {},
    }));

    const { checkRateLimit, resetRateLimitClients } = await import(
      "../src/index.js"
    );
    const result = await checkRateLimit("upstash-key", 1, 60);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSec).toBeGreaterThan(0);
    await resetRateLimitClients();
  });
});
