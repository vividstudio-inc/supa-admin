import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { fetchSchemaViaRest } = await import("../src/index.js");

const TEST_KEY =
  "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

describe("fetchSchemaViaRest", () => {
  it("when URL invalid, then returns error", async () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    const result = await fetchSchemaViaRest("not-a-url", "ignored");
    expect(result.tables).toEqual([]);
    expect(result.error).toBeDefined();
  });

  it("when fetch fails, then returns schema error", async () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );
    const { encrypt } = await import("@supa-admin/crypto");
    const result = await fetchSchemaViaRest(
      "https://example.supabase.co",
      encrypt("service-role-key"),
    );
    expect(result.tables).toEqual([]);
    expect(result.error).toContain("Schema introspection failed");
    vi.unstubAllGlobals();
  });

  it("when OpenAPI valid, then parses tables and skips underscore prefix", async () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          definitions: {
            _internal: { properties: { x: { type: "string" } } },
            posts: {
              properties: {
                id: { type: "string", format: "uuid" },
                title: { type: "string" },
              },
              required: ["id"],
            },
          },
        }),
      }),
    );
    const { encrypt } = await import("@supa-admin/crypto");
    const result = await fetchSchemaViaRest(
      "https://example.supabase.co/",
      encrypt("service-role-key"),
    );
    expect(result.error).toBeUndefined();
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0]?.table_name).toBe("posts");
    expect(result.tables[0]?.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "id",
          is_primary_key: true,
          is_nullable: false,
        }),
        expect.objectContaining({ name: "title", is_nullable: true }),
      ]),
    );
    vi.unstubAllGlobals();
  });

  it("when no public tables, then returns error", async () => {
    process.env.ENCRYPTION_KEY = TEST_KEY;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ definitions: {} }),
      }),
    );
    const { encrypt } = await import("@supa-admin/crypto");
    const result = await fetchSchemaViaRest(
      "https://example.supabase.co",
      encrypt("key"),
    );
    expect(result.error).toContain("No public tables found");
    vi.unstubAllGlobals();
  });
});
