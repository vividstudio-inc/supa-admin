import { mockSupabaseQuery } from "@supa-admin/vitest-config/supabase-mock";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();

vi.mock("@supa-admin/auth/server", () => ({
  createMetaServerClient: vi.fn(async () => ({
    from: mockFrom,
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
});

describe("buildAppMetadataPermissions", () => {
  it("when roles and overrides present, then matches resolvePermissionsRecord", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "user_roles") {
        return chainMock({ data: [{ role_id: "r1" }], error: null });
      }
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
      if (table === "user_permission_overrides") {
        return chainMock({
          data: [
            {
              id: "1",
              user_id: "u1",
              connection_id: "c1",
              table_name: "posts",
              can_read: false,
              can_create: null,
              can_update: null,
              can_delete: null,
            },
          ],
          error: null,
        });
      }
      return chainMock({ data: null, error: null });
    });

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
