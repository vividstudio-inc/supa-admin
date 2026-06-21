import { mockSupabaseQuery } from "@supa-admin/vitest-config/supabase-mock";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
const mockResolveUserPermissions = vi.fn();

vi.mock("@supa-admin/auth/permissions", () => ({
  resolveUserPermissions: (...args: unknown[]) =>
    mockResolveUserPermissions(...args),
}));

vi.mock("@supa-admin/auth/server", () => ({
  createMetaServerClient: vi.fn(async () => ({
    from: mockFrom,
  })),
  createMetaServiceClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue(
      mockSupabaseQuery({
        data: { bootstrap_status: "ready" },
        error: null,
      }),
    ),
  })),
}));

vi.mock("@supa-admin/supabase-target/admin", () => ({
  createTargetAdminClient: vi.fn(() => ({
    rpc: vi.fn().mockResolvedValue({ error: null }),
  })),
}));

function chainMock(resolved: { data: unknown; error: unknown }) {
  return mockSupabaseQuery(resolved);
}

describe("previewRlsSync", () => {
  it("when permissions exist, then returns sql and hash", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "role_permissions") {
        return chainMock({
          data: [
            {
              id: "1",
              role_id: "r1",
              connection_id: "c1",
              table_name: "posts",
              can_read: true,
              can_create: false,
              can_update: false,
              can_delete: false,
            },
          ],
          error: null,
        });
      }
      if (table === "roles") {
        return chainMock({ data: [{ id: "r1", name: "editor" }], error: null });
      }
      return chainMock({ data: null, error: null });
    });

    const { previewRlsSync } = await import("../src/index.js");
    const result = await previewRlsSync("c1");
    expect(result.permissionCount).toBe(1);
    expect(result.sql).toContain("supaadmin_has_permission");
    expect(result.sqlHash).toHaveLength(64);
  });
});

describe("executeRlsSync", () => {
  it("when rpc succeeds, then logs success", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "rls_sync_logs") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return chainMock({ data: [], error: null });
    });

    const { executeRlsSync } = await import("../src/index.js");
    const result = await executeRlsSync(
      "c1",
      "https://example.supabase.co",
      "enc",
      "user-1",
    );
    expect(result.success).toBe(true);
  });

  it("when bootstrap pending, then rejects before rpc", async () => {
    const { createMetaServiceClient } = await import("@supa-admin/auth/server");
    vi.mocked(createMetaServiceClient).mockReturnValueOnce({
      from: vi.fn().mockReturnValue(
        mockSupabaseQuery({
          data: { bootstrap_status: "pending" },
          error: null,
        }),
      ),
    } as never);

    const { executeRlsSync } = await import("../src/index.js");
    await expect(
      executeRlsSync("c1", "https://example.supabase.co", "enc", "user-1"),
    ).rejects.toThrow("Target bootstrap is not complete");
  });
});

describe("buildAppMetadataPermissions", () => {
  it("when roles and overrides present, then matches resolvePermissionsRecord", async () => {
    mockResolveUserPermissions.mockResolvedValue([
      {
        connection_id: "c1",
        table_name: "posts",
        can_read: false,
        can_create: false,
        can_update: false,
        can_delete: false,
      },
    ]);

    const { buildAppMetadataPermissions } = await import("../src/index.js");
    const result = await buildAppMetadataPermissions("u1", "c1");
    expect(result.permissions.posts).toEqual({
      can_read: false,
      can_create: false,
      can_update: false,
      can_delete: false,
    });
  });
});
