import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockFindConnectionCredentials = vi.fn();

vi.mock("@supa-admin/repository-kit", () => ({
  createDbContext: vi.fn(async () => ({ db: {}, mode: "service" })),
  findConnectionCredentials: (...args: unknown[]) =>
    mockFindConnectionCredentials(...args),
}));

describe("loadConnectionCredentials", () => {
  it("when credentials exist, then returns url and keys", async () => {
    mockFindConnectionCredentials.mockResolvedValue({
      url: "https://demo.supabase.co",
      serviceRoleEnc: "enc",
      bootstrapStatus: "ready",
    });
    const { loadConnectionCredentials } = await import(
      "../src/internal/connection-credentials"
    );
    const creds = await loadConnectionCredentials("conn-1");
    expect(creds?.url).toBe("https://demo.supabase.co");
    expect(creds?.bootstrapStatus).toBe("ready");
  });

  it("when missing, then returns null", async () => {
    mockFindConnectionCredentials.mockResolvedValue(null);
    const { loadConnectionCredentials } = await import(
      "../src/internal/connection-credentials"
    );
    expect(await loadConnectionCredentials("missing")).toBeNull();
  });
});
