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
});
