import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockIsSetupComplete = vi.fn();
const mockTryLockSetup = vi.fn();
const mockCompleteSetup = vi.fn();
const mockUnlockSetup = vi.fn();
const mockPromoteProfileToAdmin = vi.fn();

vi.mock("@supa-admin/repository-kit", () => ({
  createDbContext: vi.fn(async () => ({ db: {}, mode: "service" })),
  createSetupRepository: vi.fn(() => ({
    isSetupComplete: mockIsSetupComplete,
    tryLockSetup: mockTryLockSetup,
    completeSetup: mockCompleteSetup,
    unlockSetup: mockUnlockSetup,
    promoteProfileToAdmin: mockPromoteProfileToAdmin,
  })),
}));

const mockCreateUser = vi.fn();
vi.mock("../src/infrastructure/meta-service", () => ({
  createMetaServiceClient: vi.fn(() => ({
    auth: {
      admin: {
        createUser: mockCreateUser,
      },
    },
  })),
}));

describe("feature-setup application", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSetupComplete.mockResolvedValue(false);
    mockTryLockSetup.mockResolvedValue(true);
    mockCompleteSetup.mockResolvedValue(undefined);
    mockUnlockSetup.mockResolvedValue(undefined);
    mockPromoteProfileToAdmin.mockResolvedValue(undefined);
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "admin-1" } },
      error: null,
    });
  });

  it("isSetupComplete delegates to repository", async () => {
    mockIsSetupComplete.mockResolvedValue(true);
    const { isSetupComplete } = await import(
      "../src/application/is-setup-complete"
    );
    expect(await isSetupComplete()).toBe(true);
  });

  it("createAdmin completes setup on success", async () => {
    const { createAdmin } = await import("../src/application/create-admin");
    const result = await createAdmin({
      email: "admin@test.local",
      password: "password12345",
      displayName: "Admin",
    });
    expect(result.ok).toBe(true);
    expect(mockPromoteProfileToAdmin).toHaveBeenCalledWith("admin-1", "Admin");
    expect(mockCompleteSetup).toHaveBeenCalled();
  });

  it("createAdmin returns err when setup already locked", async () => {
    mockTryLockSetup.mockResolvedValue(false);
    const { createAdmin } = await import("../src/application/create-admin");
    const result = await createAdmin({
      email: "admin@test.local",
      password: "password12345",
      displayName: "Admin",
    });
    expect(result.ok).toBe(false);
  });

  it("createAdmin unlocks setup when auth create fails", async () => {
    mockCreateUser.mockResolvedValue({
      data: null,
      error: { message: "auth failed" },
    });
    const { createAdmin } = await import("../src/application/create-admin");
    const result = await createAdmin({
      email: "admin@test.local",
      password: "password12345",
      displayName: "Admin",
    });
    expect(result.ok).toBe(false);
    expect(mockUnlockSetup).toHaveBeenCalled();
  });
});
