import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();

vi.mock("../src/meta-server.js", () => ({
  createMetaServiceClient: vi.fn(() => ({ from: mockFrom })),
  createMetaServerClient: vi.fn(),
}));

describe("isSetupComplete", () => {
  it("when setup_complete is true, then returns true", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { value: true } }),
    });

    const { isSetupComplete } = await import("../src/permissions.js");
    await expect(isSetupComplete()).resolves.toBe(true);
  });

  it("when setup_complete is false string, then returns false", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { value: "false" } }),
    });

    const { isSetupComplete } = await import("../src/permissions.js");
    await expect(isSetupComplete()).resolves.toBe(false);
  });
});
