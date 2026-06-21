import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockResolveUserPermissions = vi.fn();

vi.mock("@supa-admin/auth/permissions", () => ({
  resolveUserPermissions: (...args: unknown[]) =>
    mockResolveUserPermissions(...args),
}));

describe("buildTargetJwtPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when platform_admin, then grants full access for all connection tables", async () => {
    mockResolveUserPermissions.mockResolvedValue([
      {
        connection_id: "conn-1",
        table_name: "posts",
        can_read: true,
        can_create: true,
        can_update: true,
        can_delete: true,
      },
      {
        connection_id: "conn-1",
        table_name: "comments",
        can_read: true,
        can_create: true,
        can_update: true,
        can_delete: true,
      },
    ]);

    const { buildTargetJwtPermissions } = await import(
      "../src/jwt-permissions.js"
    );
    const result = await buildTargetJwtPermissions(
      "user-1",
      "conn-1",
      "platform_admin",
    );

    expect(mockResolveUserPermissions).toHaveBeenCalledWith(
      "user-1",
      "conn-1",
      "platform_admin",
    );
    expect(result.permissions.posts).toEqual({
      can_read: true,
      can_create: true,
      can_update: true,
      can_delete: true,
    });
    expect(result.permissions.comments?.can_read).toBe(true);
  });

  it("when member with roles, then uses role permissions via resolveUserPermissions", async () => {
    mockResolveUserPermissions.mockResolvedValue([
      {
        connection_id: "conn-1",
        table_name: "posts",
        can_read: true,
        can_create: false,
        can_update: false,
        can_delete: false,
      },
    ]);

    const { buildTargetJwtPermissions } = await import(
      "../src/jwt-permissions.js"
    );
    const result = await buildTargetJwtPermissions(
      "user-1",
      "conn-1",
      "member",
    );

    expect(result.permissions.posts).toEqual({
      can_read: true,
      can_create: false,
      can_update: false,
      can_delete: false,
    });
  });
});
