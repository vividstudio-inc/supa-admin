import { mockSupabaseQuery } from "@supa-admin/vitest-config/supabase-mock";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();

vi.mock("@supa-admin/auth/server", () => ({
  createMetaServerClient: vi.fn(async () => ({ from: mockFrom })),
}));

function chainMock(resolved: { data: unknown; error: unknown }) {
  return mockSupabaseQuery(resolved);
}

describe("syncConnectionSchema", () => {
  it("when tables returned, then syncConnectionSchema succeeds", async () => {
    const connectionId = "00000000-0000-4000-8000-000000000002";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          definitions: {
            posts: {
              properties: { id: { type: "string", format: "uuid" } },
              required: ["id"],
            },
          },
        }),
      }),
    );

    process.env.ENCRYPTION_KEY =
      "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

    mockFrom.mockImplementation((table: string) => {
      if (table === "connection_tables") {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "connections") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return chainMock({ data: null, error: null });
    });

    const { encrypt } = await import("@supa-admin/crypto");
    const { syncConnectionSchema } = await import("../src/index.js");
    const result = await syncConnectionSchema(
      connectionId,
      "https://example.supabase.co",
      encrypt("service-key"),
    );
    expect(result.success).toBe(true);
    expect(result.tableCount).toBe(1);
    vi.unstubAllGlobals();
  });
});
