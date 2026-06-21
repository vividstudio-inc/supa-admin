import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockIsSetupComplete = vi.fn();
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@supa-admin/feature-setup", () => ({
  isSetupComplete: () => mockIsSetupComplete(),
}));

vi.mock("../src/meta-server.js", () => ({
  createMetaServerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

describe("isSetupComplete", () => {
  it("when setup_complete is true, then returns true", async () => {
    mockIsSetupComplete.mockResolvedValue(true);

    const { isSetupComplete } = await import("../src/permissions.js");
    await expect(isSetupComplete()).resolves.toBe(true);
  });

  it("when setup_complete is false string, then returns false", async () => {
    mockIsSetupComplete.mockResolvedValue(false);

    const { isSetupComplete } = await import("../src/permissions.js");
    await expect(isSetupComplete()).resolves.toBe(false);
  });
});

describe("getCurrentProfile", () => {
  it("when no auth user, then returns null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { getCurrentProfile } = await import("../src/permissions.js");
    await expect(getCurrentProfile()).resolves.toBeNull();
  });

  it("when user and profile exist, then returns profile", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "user-1", role: "member", email: "a@test.local" },
          }),
        }),
      }),
    });
    const { getCurrentProfile } = await import("../src/permissions.js");
    const profile = await getCurrentProfile();
    expect(profile?.id).toBe("user-1");
  });
});

describe("requireAuth", () => {
  it("when unauthenticated, then throws", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { requireAuth } = await import("../src/permissions.js");
    await expect(requireAuth()).rejects.toThrow("Unauthorized");
  });
});

describe("requirePlatformAdmin", () => {
  it("when member role, then throws forbidden", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "user-1", role: "member", email: "a@test.local" },
          }),
        }),
      }),
    });
    const { requirePlatformAdmin } = await import("../src/permissions.js");
    await expect(requirePlatformAdmin()).rejects.toThrow("Forbidden");
  });
});
