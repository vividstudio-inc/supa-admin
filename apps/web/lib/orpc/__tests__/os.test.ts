import { middlewareOutputFn, ORPCError } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrpcContext } from "../os.js";

vi.mock("server-only", () => ({}));

const mockGetCurrentProfile = vi.fn();

vi.mock("@supa-admin/auth/permissions", () => ({
  getCurrentProfile: (...args: unknown[]) => mockGetCurrentProfile(...args),
  requirePlatformAdmin: vi.fn(),
  isSetupComplete: vi.fn(),
}));

function invokeWithAdmin(
  context: OrpcContext,
  next = vi.fn(async () => ({
    output: undefined,
    context: {},
  })),
) {
  return import("../os.js").then(({ withAdmin }) =>
    withAdmin(
      {
        context,
        next: next as never,
        path: [],
        procedure: {} as never,
        signal: new AbortController().signal,
        lastEventId: undefined,
        errors: {} as never,
      },
      undefined,
      middlewareOutputFn,
    ),
  );
}

function invokeWithAuth(
  context: OrpcContext,
  next = vi.fn(async () => ({
    output: undefined,
    context: {},
  })),
) {
  return import("../os.js").then(({ withAuth }) =>
    withAuth(
      {
        context,
        next: next as never,
        path: [],
        procedure: {} as never,
        signal: new AbortController().signal,
        lastEventId: undefined,
        errors: {} as never,
      },
      undefined,
      middlewareOutputFn,
    ),
  );
}

describe("withAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when actorId is null, then throws UNAUTHORIZED", async () => {
    const next = vi.fn();
    await expect(
      invokeWithAdmin({ actorId: null, clientIp: "127.0.0.1" }, next),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(next).not.toHaveBeenCalled();
  });

  it("when profile is not platform_admin, then throws FORBIDDEN", async () => {
    mockGetCurrentProfile.mockResolvedValue({ id: "u1", role: "member" });
    await expect(
      invokeWithAdmin({ actorId: "u1", clientIp: "127.0.0.1" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("when platform_admin, then calls next with profile", async () => {
    const profile = { id: "admin-1", role: "platform_admin" as const };
    mockGetCurrentProfile.mockResolvedValue(profile);
    const next = vi.fn(
      async ({ context }: { context: Record<string, unknown> }) => ({
        output: undefined,
        context,
      }),
    );
    await invokeWithAdmin({ actorId: "admin-1", clientIp: "127.0.0.1" }, next);
    expect(next).toHaveBeenCalledWith({
      context: expect.objectContaining({
        actorId: "admin-1",
        profile,
      }),
    });
  });

  it("when profile missing, then throws FORBIDDEN", async () => {
    mockGetCurrentProfile.mockResolvedValue(null);
    await expect(
      invokeWithAdmin({ actorId: "u1", clientIp: "127.0.0.1" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

describe("withAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when actorId is null, then throws UNAUTHORIZED", async () => {
    await expect(
      invokeWithAuth({ actorId: null, clientIp: "127.0.0.1" }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("when profile exists, then calls next with profile", async () => {
    const profile = { id: "user-1", role: "member" as const };
    mockGetCurrentProfile.mockResolvedValue(profile);
    const next = vi.fn(
      async ({ context }: { context: Record<string, unknown> }) => ({
        output: undefined,
        context,
      }),
    );
    await invokeWithAuth({ actorId: "user-1", clientIp: "127.0.0.1" }, next);
    expect(next).toHaveBeenCalledWith({
      context: expect.objectContaining({ profile }),
    });
  });
});

describe("ORPCError", () => {
  it("when constructed, then has code", () => {
    const err = new ORPCError("BAD_REQUEST", { message: "test" });
    expect(err.code).toBe("BAD_REQUEST");
  });
});
