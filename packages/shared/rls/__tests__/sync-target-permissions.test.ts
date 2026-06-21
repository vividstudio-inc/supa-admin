import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
const mockListUsers = vi.fn();
const mockUpdateUserById = vi.fn();
const mockUpsert = vi.fn();

vi.mock("@supa-admin/auth/server", () => ({
  createMetaServerClient: vi.fn(async () => ({
    from: mockFrom,
  })),
  createMetaServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

vi.mock("@supa-admin/supabase-target/admin", () => ({
  createTargetAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        listUsers: mockListUsers,
        updateUserById: mockUpdateUserById,
      },
    },
  })),
}));

vi.mock("../src/jwt-permissions.js", () => ({
  buildTargetJwtPermissions: vi.fn().mockResolvedValue({
    permissions: {
      posts: {
        can_read: true,
        can_create: true,
        can_update: true,
        can_delete: true,
      },
    },
  }),
}));

describe("syncTargetUserPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: "target-1", email: "user@example.com" }] },
      error: null,
    });
    mockUpdateUserById.mockResolvedValue({ error: null });
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("when member without mapping, then returns target_user_not_found", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    });

    const { syncTargetUserPermissions } = await import(
      "../src/sync-target-permissions.js"
    );
    const result = await syncTargetUserPermissions({
      metaUserId: "meta-1",
      connectionId: "conn-1",
      platformRole: "member",
      targetEmail: "user@example.com",
      url: "https://example.supabase.co",
      serviceRoleEnc: "enc",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("target_user_not_found");
    }
  });

  it("when platform_admin and target user exists, then updates jwt and mapping", async () => {
    mockFrom.mockReturnValue({
      upsert: mockUpsert,
    });

    const { syncTargetUserPermissions } = await import(
      "../src/sync-target-permissions.js"
    );
    const result = await syncTargetUserPermissions({
      metaUserId: "meta-1",
      connectionId: "conn-1",
      platformRole: "platform_admin",
      targetEmail: "user@example.com",
      url: "https://example.supabase.co",
      serviceRoleEnc: "enc",
    });

    expect(result).toEqual({ success: true, targetUserId: "target-1" });
    expect(mockUpdateUserById).toHaveBeenCalledWith("target-1", {
      app_metadata: {
        permissions: {
          posts: {
            can_read: true,
            can_create: true,
            can_update: true,
            can_delete: true,
          },
        },
      },
    });
  });
});
