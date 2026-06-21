import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockReplaceRolePermissions = vi.fn();
const mockCreateRole = vi.fn();
const mockGetRolePermissions = vi.fn();
const mockGetUserPermissionOverrides = vi.fn();
const mockGetRolePermissionsForUser = vi.fn();
const mockGetUserPermissionOverrideRows = vi.fn();
const mockGetMemberConnectionIds = vi.fn();
const mockListAllConnectionIds = vi.fn();
const mockListConnectionTableNames = vi.fn();

vi.mock("@supa-admin/repository-kit", () => ({
  createDbContext: vi.fn(async () => ({ db: {}, mode: "service" })),
  createAccessRepository: vi.fn(() => ({
    replaceRolePermissions: mockReplaceRolePermissions,
    createRole: mockCreateRole,
    getRolePermissions: mockGetRolePermissions,
    getUserPermissionOverrides: mockGetUserPermissionOverrides,
    getRolePermissionsForUser: mockGetRolePermissionsForUser,
    getUserPermissionOverrideRows: mockGetUserPermissionOverrideRows,
    getMemberConnectionIds: mockGetMemberConnectionIds,
    listAllConnectionIds: mockListAllConnectionIds,
  })),
  listConnectionTableNames: (...args: unknown[]) =>
    mockListConnectionTableNames(...args),
}));

describe("feature-access application", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRole.mockResolvedValue({
      id: "role-1",
      name: "Editor",
      description: null,
    });
    mockReplaceRolePermissions.mockResolvedValue(undefined);
    mockGetRolePermissions.mockResolvedValue([
      {
        table_name: "posts",
        can_read: true,
        can_create: false,
        can_update: false,
        can_delete: false,
      },
    ]);
    mockGetUserPermissionOverrides.mockResolvedValue([]);
    mockGetRolePermissionsForUser.mockResolvedValue([
      {
        table_name: "posts",
        can_read: true,
        can_create: false,
        can_update: false,
        can_delete: false,
      },
    ]);
    mockGetUserPermissionOverrideRows.mockResolvedValue([]);
    mockGetMemberConnectionIds.mockResolvedValue(["conn-1"]);
    mockListAllConnectionIds.mockResolvedValue(["conn-1", "conn-2"]);
    mockListConnectionTableNames.mockResolvedValue(["posts"]);
  });

  it("createRole validates and persists role", async () => {
    const { createRole } = await import("../src/application/create-role");
    const result = await createRole("Editor", "desc");
    expect(result.ok).toBe(true);
    expect(mockCreateRole).toHaveBeenCalledWith("Editor", "desc");
  });

  it("createRole returns err for invalid name", async () => {
    const { createRole } = await import("../src/application/create-role");
    const result = await createRole("  ");
    expect(result.ok).toBe(false);
  });

  it("updateRolePermissions replaces permissions", async () => {
    const { updateRolePermissions } = await import(
      "../src/application/update-role-permissions"
    );
    const perms = [
      {
        table_name: "posts",
        can_read: true,
        can_create: true,
        can_update: false,
        can_delete: false,
      },
    ];
    const result = await updateRolePermissions("role-1", "conn-1", perms);
    expect(result.ok).toBe(true);
    expect(mockReplaceRolePermissions).toHaveBeenCalledWith(
      "role-1",
      "conn-1",
      perms,
    );
  });

  it("getRolePermissions reads from repository", async () => {
    const { getRolePermissions } = await import(
      "../src/application/get-role-permissions"
    );
    const rows = await getRolePermissions("role-1", "conn-1");
    expect(rows).toHaveLength(1);
    expect(mockGetRolePermissions).toHaveBeenCalled();
  });

  it("getUserOverrides returns override rows", async () => {
    mockGetUserPermissionOverrideRows.mockResolvedValue([
      {
        table_name: "posts",
        can_read: true,
        can_create: null,
        can_update: null,
        can_delete: null,
      },
    ]);
    const { getUserOverrides } = await import(
      "../src/application/get-user-overrides"
    );
    const result = await getUserOverrides("user-1", "conn-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.overrides).toHaveLength(1);
  });
});

describe("resolveUserPermissions use case", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListConnectionTableNames.mockResolvedValue(["posts", "comments"]);
    mockGetRolePermissionsForUser.mockResolvedValue([
      {
        table_name: "posts",
        can_read: true,
        can_create: false,
        can_update: false,
        can_delete: false,
      },
    ]);
    mockGetUserPermissionOverrideRows.mockResolvedValue([
      {
        table_name: "posts",
        can_read: null,
        can_create: true,
        can_update: null,
        can_delete: null,
      },
    ]);
    mockGetMemberConnectionIds.mockResolvedValue(["conn-1"]);
    mockListAllConnectionIds.mockResolvedValue(["conn-1"]);
  });

  it("when platform_admin, then full access on all tables", async () => {
    const { resolveUserPermissions } = await import(
      "../src/application/resolve-user-permissions"
    );
    const perms = await resolveUserPermissions(
      "admin-1",
      "conn-1",
      "platform_admin",
    );
    expect(perms).toHaveLength(2);
    expect(perms[0].can_delete).toBe(true);
  });

  it("when member, then merges role permissions and overrides", async () => {
    const { resolveUserPermissions, canAccessTable } = await import(
      "../src/application/resolve-user-permissions"
    );
    const perms = await resolveUserPermissions("user-1", "conn-1", "member");
    expect(perms[0].can_create).toBe(true);
    expect(
      await canAccessTable("user-1", "conn-1", "posts", "can_create", "member"),
    ).toBe(true);
  });

  it("getUserConnectionIds returns all ids for admin", async () => {
    const { getUserConnectionIds } = await import(
      "../src/application/resolve-user-permissions"
    );
    const ids = await getUserConnectionIds("admin-1", "platform_admin");
    expect(ids).toEqual(["conn-1"]);
  });
});
