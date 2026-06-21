import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
const mockCreateMetaServerClient = vi.fn();

vi.mock("@supa-admin/auth/server", () => ({
  createMetaServerClient: () => mockCreateMetaServerClient(),
}));

function chain(result: unknown) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
  return builder;
}

describe("getConnectionOnboardingStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateMetaServerClient.mockResolvedValue({
      from: mockFrom,
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "connections") {
        return chain({
          data: {
            bootstrap_status: "ready",
            schema_cached_at: "2024-01-01T00:00:00.000Z",
          },
        });
      }
      if (table === "role_permissions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 2 }),
          }),
        };
      }
      if (table === "target_user_mappings") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 1 }),
          }),
        };
      }
      return chain({ data: null });
    });
  });

  it("when all steps complete, then complete is true", async () => {
    const { getConnectionOnboardingStatus } = await import(
      "../src/onboarding-status"
    );
    const result = await getConnectionOnboardingStatus("conn-1");
    expect(result.complete).toBe(true);
    expect(result.steps.bootstrap).toBe(true);
    expect(result.steps.schemaSynced).toBe(true);
    expect(result.steps.rolesConfigured).toBe(true);
    expect(result.steps.usersProvisioned).toBe(true);
  });

  it("when bootstrap pending, then complete is false", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "connections") {
        return chain({
          data: { bootstrap_status: "pending", schema_cached_at: null },
        });
      }
      if (table === "role_permissions") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0 }),
          }),
        };
      }
      if (table === "target_user_mappings") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 0 }),
          }),
        };
      }
      return chain({ data: null });
    });

    const { getConnectionOnboardingStatus } = await import(
      "../src/onboarding-status"
    );
    const result = await getConnectionOnboardingStatus("conn-1");
    expect(result.complete).toBe(false);
    expect(result.steps.bootstrap).toBe(false);
  });
});
