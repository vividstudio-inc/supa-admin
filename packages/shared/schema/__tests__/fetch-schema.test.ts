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
            comments: {
              properties: {
                id: { type: "string", format: "uuid" },
                post_id: {
                  type: "string",
                  format: "uuid",
                  description:
                    "Note:\nThis is a Foreign Key to `posts.id`.<fk table='posts' column='id'/>",
                },
              },
              required: ["id", "post_id"],
            },
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
    expect(result.tables).toHaveLength(2);
    const comments = result.tables.find((t) => t.table_name === "comments");
    expect(comments?.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "post_id",
          foreign_key: { table: "posts", column: "id" },
        }),
      ]),
    );
    const posts = result.tables.find((t) => t.table_name === "posts");
    expect(posts?.table_name).toBe("posts");
    expect(posts?.columns).toEqual(
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
