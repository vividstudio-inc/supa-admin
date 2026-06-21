import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockReplace = vi.fn();
const mockFindProfileById = vi.fn();

vi.mock("@supa-admin/repository-kit", () => ({
  createDbContext: vi.fn(async () => ({ db: {}, mode: "service" })),
  createUsersRepository: vi.fn(() => ({
    findProfileById: mockFindProfileById,
  })),
  createAccessRepository: vi.fn(() => ({
    replaceUserPermissionOverrides: mockReplace,
  })),
}));

describe("updateUserOverrides", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindProfileById.mockResolvedValue({
      id: "user-1",
      role: "member",
    });
    mockReplace.mockResolvedValue(undefined);
  });

  it("when overrides provided, then persists via repository", async () => {
    const { updateUserOverrides } = await import(
      "../src/application/update-user-overrides"
    );

    const result = await updateUserOverrides("user-1", "conn-1", [
      {
        table_name: "posts",
        can_read: true,
        can_create: null,
        can_update: null,
        can_delete: false,
      },
    ]);

    expect(result.ok).toBe(true);
    expect(mockReplace).toHaveBeenCalledWith("user-1", "conn-1", [
      expect.objectContaining({ table_name: "posts", can_read: true }),
    ]);
  });

  it("when platform_admin, then rejects overrides", async () => {
    mockFindProfileById.mockResolvedValue({
      id: "admin-1",
      role: "platform_admin",
    });

    const { updateUserOverrides } = await import(
      "../src/application/update-user-overrides"
    );

    const result = await updateUserOverrides("admin-1", "conn-1", []);

    expect(result.ok).toBe(false);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
