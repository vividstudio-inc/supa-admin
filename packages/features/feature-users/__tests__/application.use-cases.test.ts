import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockListProfiles = vi.fn();
const mockFindProfileById = vi.fn();
const mockUpdateProfile = vi.fn();
const mockFindConnectionById = vi.fn();
const mockDbDelete = vi.fn();
const mockDbInsert = vi.fn();

const mockReplaceUserRoles = vi.fn();
const mockReplaceConnectionMemberships = vi.fn();

vi.mock("@supa-admin/repository-kit", () => ({
  createDbContext: vi.fn(async () => ({
    db: {
      delete: mockDbDelete.mockReturnValue({ where: vi.fn() }),
      insert: mockDbInsert.mockReturnValue({ values: vi.fn() }),
    },
    mode: "service",
  })),
  createUsersRepository: vi.fn(() => ({
    listProfiles: mockListProfiles,
    findProfileById: mockFindProfileById,
    updateProfile: mockUpdateProfile,
    replaceUserRoles: mockReplaceUserRoles,
    replaceConnectionMemberships: mockReplaceConnectionMemberships,
    getUserRoles: vi.fn().mockResolvedValue([]),
    getMemberships: vi.fn().mockResolvedValue([]),
  })),
  createConnectionRepository: vi.fn(() => ({
    findById: mockFindConnectionById,
  })),
}));

const mockBuildJwt = vi.fn();
vi.mock("@supa-admin/rls", () => ({
  buildTargetJwtPermissions: (...args: unknown[]) => mockBuildJwt(...args),
}));

const mockCreateTargetUser = vi.fn();
vi.mock("@supa-admin/supabase-target/admin", () => ({
  createTargetAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        createUser: mockCreateTargetUser,
      },
    },
  })),
}));

vi.mock("@supa-admin/auth/server", () => ({
  createMetaServiceClient: vi.fn(() => ({
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: "new-user-1" } },
          error: null,
        }),
      },
    },
  })),
}));

describe("feature-users application", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListProfiles.mockResolvedValue([
      { id: "user-1", email: "a@test.local" },
    ]);
    mockFindProfileById.mockResolvedValue({
      id: "user-1",
      role: "member",
      email: "a@test.local",
    });
    mockUpdateProfile.mockResolvedValue({
      id: "user-1",
      display_name: "Updated",
    });
    mockFindConnectionById.mockResolvedValue({
      id: "conn-1",
      url: "https://target.supabase.co",
      service_role_enc: "enc",
      bootstrap_status: "ready",
    });
    mockBuildJwt.mockResolvedValue({ permissions: [] });
    mockCreateTargetUser.mockResolvedValue({
      data: { user: { id: "target-user-1" } },
      error: null,
    });
    mockDbDelete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    mockDbInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("listUsers returns profiles", async () => {
    const { listUsers } = await import("../src/application/list-users");
    const users = await listUsers();
    expect(users).toHaveLength(1);
    expect(mockListProfiles).toHaveBeenCalled();
  });

  it("getUser returns profile when found", async () => {
    const { getUser } = await import("../src/application/get-user");
    const result = await getUser("user-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.profile.id).toBe("user-1");
  });

  it("updateUser persists profile changes", async () => {
    const { updateUser } = await import("../src/application/update-user");
    const result = await updateUser({
      id: "user-1",
      displayName: "Updated",
    });
    expect(result.ok).toBe(true);
    expect(mockUpdateProfile).toHaveBeenCalledWith("user-1", {
      displayName: "Updated",
      role: undefined,
    });
  });

  it("updateUser ignores role assignments for platform_admin", async () => {
    mockFindProfileById.mockResolvedValue({
      id: "admin-1",
      role: "platform_admin",
      email: "admin@test.local",
    });

    const { updateUser } = await import("../src/application/update-user");
    const result = await updateUser({
      id: "admin-1",
      roleIds: ["role-1"],
      connectionIds: ["conn-1"],
    });

    expect(result.ok).toBe(true);
    expect(mockReplaceUserRoles).toHaveBeenCalledWith("admin-1", []);
    expect(mockReplaceConnectionMemberships).toHaveBeenCalledWith(
      "admin-1",
      [],
    );
  });

  it("provisionTargetUser creates target user and mapping", async () => {
    const { provisionTargetUser } = await import(
      "../src/application/provision-target-user"
    );
    const result = await provisionTargetUser({
      userId: "user-1",
      connectionId: "conn-1",
      email: "target@test.local",
      password: "password12345",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.targetUserId).toBe("target-user-1");
    expect(mockCreateTargetUser).toHaveBeenCalled();
  });

  it("provisionTargetUser fails when bootstrap not ready", async () => {
    mockFindConnectionById.mockResolvedValue({
      id: "conn-1",
      bootstrap_status: "pending",
    });
    const { provisionTargetUser } = await import(
      "../src/application/provision-target-user"
    );
    const result = await provisionTargetUser({
      userId: "user-1",
      connectionId: "conn-1",
      email: "target@test.local",
      password: "password12345",
    });
    expect(result.ok).toBe(false);
  });

  it("createUser rejects empty email", async () => {
    const { createUser } = await import("../src/application/create-user");
    const result = await createUser({
      email: "   ",
      password: "password12345",
      displayName: "User",
    });
    expect(result.ok).toBe(false);
  });
});
