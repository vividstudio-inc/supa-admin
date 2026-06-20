import { mockSupabaseQuery } from "@supa-admin/vitest-config/supabase-mock";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminCallContext,
  callWithInput,
  callWithoutInput,
  TEST_IDS,
} from "./helpers.js";

const { mockServerFrom } = vi.hoisted(() => ({
  mockServerFrom: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@supa-admin/rls", () => ({
  previewRlsSync: vi.fn().mockResolvedValue({
    sql: "-- sql",
    sqlHash: "abc",
    permissionCount: 1,
  }),
  executeRlsSync: vi.fn(),
  buildAppMetadataPermissions: vi.fn(),
}));

vi.mock("@supa-admin/schema", () => ({
  fetchSchemaViaRest: vi.fn(),
  syncConnectionSchema: vi.fn(),
}));

vi.mock("@supa-admin/crypto", () => ({
  encrypt: vi.fn((v: string) => `enc:${v}`),
}));

vi.mock("@supa-admin/supabase-target/admin", () => ({
  createTargetAdminClient: vi.fn(),
}));

vi.mock("@supa-admin/utils", () => ({
  validateTargetUrl: vi.fn((url: string) =>
    url.startsWith("http")
      ? { ok: true }
      : { ok: false, reason: "Invalid URL" },
  ),
}));

vi.mock("@supa-admin/auth/server", () => ({
  createMetaServiceClient: vi.fn(),
  createMetaServerClient: vi.fn(async () => ({ from: mockServerFrom })),
}));

vi.mock("@/lib/env", () => ({
  env: {
    SETUP_SECRET:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  },
}));

vi.mock("@supa-admin/auth/permissions", () => ({
  isSetupComplete: vi.fn().mockResolvedValue(true),
  requirePlatformAdmin: vi.fn().mockResolvedValue({
    id: TEST_IDS.user,
    role: "platform_admin",
  }),
  getCurrentProfile: vi.fn().mockResolvedValue({
    id: TEST_IDS.user,
    role: "platform_admin",
  }),
}));

const adminCtx = adminCallContext();

describe("setupHandlers", () => {
  it("when isComplete called, then returns complete flag", async () => {
    const { setupHandlers } = await import("../handlers/index.js");
    const result = await callWithoutInput(setupHandlers.isComplete, {
      context: { actorId: null },
    });
    expect(result).toEqual({ complete: true });
  });
});

describe("connectionsHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when list called, then returns connections", async () => {
    mockServerFrom.mockReturnValue(
      mockSupabaseQuery({
        data: [
          {
            id: TEST_IDS.connection,
            name: "Conn",
            url: "https://x.co",
            schema_cached_at: null,
          },
        ],
        error: null,
      }),
    );
    const { connectionsHandlers } = await import("../handlers/index.js");
    const result = await callWithoutInput(connectionsHandlers.list, {
      context: adminCtx,
    });
    expect(result).toEqual({
      connections: [
        {
          id: TEST_IDS.connection,
          name: "Conn",
          url: "https://x.co",
          schema_cached_at: null,
        },
      ],
    });
  });

  it("when create with invalid url, then throws BAD_REQUEST", async () => {
    const { connectionsHandlers } = await import("../handlers/index.js");
    await expect(
      callWithInput(
        connectionsHandlers.create,
        {
          name: "Test",
          url: "not-valid",
          anonKey: "anon",
          serviceRoleKey: "service",
        },
        { context: adminCtx },
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("rolesHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when list called, then returns roles", async () => {
    mockServerFrom.mockReturnValue(
      mockSupabaseQuery({
        data: [{ id: TEST_IDS.role, name: "Editor", description: null }],
        error: null,
      }),
    );
    const { rolesHandlers } = await import("../handlers/index.js");
    const result = await callWithoutInput(rolesHandlers.list, {
      context: adminCtx,
    });
    expect(result).toEqual({
      roles: [{ id: TEST_IDS.role, name: "Editor", description: null }],
    });
  });
});

describe("usersHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when list called, then returns users", async () => {
    mockServerFrom.mockReturnValue(
      mockSupabaseQuery({
        data: [
          {
            id: TEST_IDS.user,
            email: "a@b.com",
            display_name: "A",
            role: "member",
            created_at: "2024-01-01",
          },
        ],
        error: null,
      }),
    );
    const { usersHandlers } = await import("../handlers/index.js");
    const result = await callWithoutInput(usersHandlers.list, {
      context: adminCtx,
    });
    expect(result).toEqual({
      users: [
        {
          id: TEST_IDS.user,
          email: "a@b.com",
          display_name: "A",
          role: "member",
          created_at: "2024-01-01",
        },
      ],
    });
  });
});

describe("connectionsRlsHandlers", () => {
  it("when preview called, then delegates to previewRlsSync", async () => {
    const { previewRlsSync } = await import("@supa-admin/rls");
    const { connectionsRlsHandlers } = await import("../handlers/index.js");

    const result = await callWithInput(
      connectionsRlsHandlers.preview,
      { id: TEST_IDS.connection },
      { context: adminCtx },
    );

    expect(previewRlsSync).toHaveBeenCalledWith(TEST_IDS.connection);
    expect(result).toEqual({
      sql: "-- sql",
      sqlHash: "abc",
      permissionCount: 1,
    });
  });
});
