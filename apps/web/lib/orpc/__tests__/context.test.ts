import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@supa-admin/auth/server", () => ({
  createMetaServerClient: vi.fn(),
}));

describe("createOrpcContextFromRequest", () => {
  it("when user authenticated, then returns actorId", async () => {
    const { createMetaServerClient } = await import("@supa-admin/auth/server");
    vi.mocked(createMetaServerClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "user-123" } } }),
      },
    } as never);

    const { createOrpcContextFromRequest } = await import("../context.js");
    const context = await createOrpcContextFromRequest(
      new Request("http://localhost"),
    );
    expect(context).toEqual({ actorId: "user-123" });
  });

  it("when user missing, then returns null actorId", async () => {
    const { createMetaServerClient } = await import("@supa-admin/auth/server");
    vi.mocked(createMetaServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as never);

    const { createOrpcContextFromRequest } = await import("../context.js");
    const context = await createOrpcContextFromRequest(
      new Request("http://localhost"),
    );
    expect(context).toEqual({ actorId: null });
  });
});
