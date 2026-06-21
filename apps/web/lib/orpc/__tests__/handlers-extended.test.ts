import { mockSupabaseQuery } from "@supa-admin/vitest-config/supabase-mock";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminCallContext,
  callWithInput,
  SETUP_SECRET,
  TEST_IDS,
} from "./helpers.js";

const { mockServiceFrom, mockServerFrom, mockServiceAuth } = vi.hoisted(() => ({
  mockServiceFrom: vi.fn(),
  mockServerFrom: vi.fn(),
  mockServiceAuth: {
    admin: {
      createUser: vi.fn().mockResolvedValue({
        data: {
          user: { id: "00000000-0000-4000-8000-000000000010" },
        },
        error: null,
      }),
    },
  },
}));

vi.mock("server-only", () => ({}));

vi.mock("@supa-admin/rls", () => ({
  previewRlsSync: vi.fn(),
  executeRlsSync: vi.fn().mockResolvedValue({ success: true, sql: "-- sql" }),
  buildAppMetadataPermissions: vi.fn().mockResolvedValue({ permissions: {} }),
  probeConnectionBootstrap: vi
    .fn()
    .mockResolvedValue({ ready: true, mode: "supaadmin" }),
  executeTargetBootstrap: vi.fn().mockResolvedValue({ success: true }),
  verifyConnectionBootstrap: vi
    .fn()
    .mockResolvedValue({ success: true, status: "ready" }),
  syncTargetUserPermissions: vi
    .fn()
    .mockResolvedValue({ success: true, targetUserId: TEST_IDS.targetUser }),
  getConnectionOnboardingStatus: vi.fn().mockResolvedValue({
    steps: {
      bootstrap: true,
      schemaSynced: true,
      rolesConfigured: true,
      usersProvisioned: true,
    },
    complete: true,
  }),
}));

vi.mock("@supa-admin/schema", () => ({
  fetchSchemaViaRest: vi.fn().mockResolvedValue({
    tables: [{ table_name: "posts", columns: [] }],
  }),
  syncConnectionSchema: vi
    .fn()
    .mockResolvedValue({ success: true, tableCount: 1 }),
}));

vi.mock("@supa-admin/crypto", () => ({
  encrypt: vi.fn((v: string) => `enc:${v}`),
}));

vi.mock("@supa-admin/supabase-target/admin", () => ({
  createTargetAdminClient: vi.fn(() => ({
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: TEST_IDS.targetUser } },
          error: null,
        }),
      },
    },
  })),
}));

vi.mock("@supa-admin/utils", () => ({
  validateTargetUrl: vi.fn(() => ({ ok: true })),
}));

vi.mock("@supa-admin/auth/server", () => ({
  createMetaServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
    auth: mockServiceAuth,
  })),
  createMetaServerClient: vi.fn(async () => ({ from: mockServerFrom })),
}));

vi.mock("@/lib/env", () => ({
  env: {
    SETUP_SECRET:
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  },
}));

vi.mock("@supa-admin/auth/permissions", () => ({
  isSetupComplete: vi.fn().mockResolvedValue(false),
  requirePlatformAdmin: vi.fn().mockResolvedValue({
    id: TEST_IDS.user,
    role: "platform_admin",
  }),
  getCurrentProfile: vi.fn().mockResolvedValue({
    id: TEST_IDS.user,
    role: "platform_admin",
  }),
  getUserConnectionIds: vi.fn().mockResolvedValue([TEST_IDS.connection]),
}));

const adminCtx = adminCallContext();

describe("setupHandlers.createAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when lock acquired, then creates admin user", async () => {
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "app_settings") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({
                  data: [{ key: "setup_complete" }],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return mockSupabaseQuery({ data: null, error: null });
    });

    const { setupHandlers } = await import("../handlers/index.js");
    const result = await callWithInput(
      setupHandlers.createAdmin,
      {
        email: "admin@example.com",
        password: "password123",
        displayName: "Admin",
        setupSecret: SETUP_SECRET,
      },
      { context: { actorId: null, clientIp: "127.0.0.1" } },
    );
    expect(result).toEqual({ success: true });
  });
});

describe("connectionsHandlers.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when valid input, then creates connection", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "connections") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: TEST_IDS.connection,
                  name: "Test",
                  url: "https://example.supabase.co",
                  schema_cached_at: null,
                  bootstrap_status: "pending",
                  bootstrap_verified_at: null,
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: TEST_IDS.connection,
                  name: "Test",
                  url: "https://example.supabase.co",
                  schema_cached_at: null,
                  bootstrap_status: "ready",
                  bootstrap_verified_at: "2024-01-01T00:00:00Z",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "connection_tables") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return mockSupabaseQuery({ data: null, error: null });
    });

    const { connectionsHandlers } = await import("../handlers/index.js");
    const result = await callWithInput(
      connectionsHandlers.create,
      {
        name: "Test",
        url: "https://example.supabase.co/",
        anonKey: "anon",
        serviceRoleKey: "service",
      },
      { context: adminCtx },
    );
    expect(result.connection.id).toBe(TEST_IDS.connection);
    expect(result.tableCount).toBe(1);
  });
});

describe("connectionsHandlers.schemaSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when connection exists, then syncs schema", async () => {
    mockServerFrom.mockReturnValue(
      mockSupabaseQuery({
        data: {
          id: TEST_IDS.connection,
          url: "https://example.supabase.co",
          service_role_enc: "enc",
        },
        error: null,
      }),
    );

    const { connectionsHandlers } = await import("../handlers/index.js");
    const result = await callWithInput(
      connectionsHandlers.schemaSync,
      { id: TEST_IDS.connection },
      { context: adminCtx },
    );
    expect(result).toEqual({ success: true, tableCount: 1 });
  });
});

describe("rolesHandlers.updatePermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when permissions provided, then replaces role permissions", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "role_permissions") {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "connections") {
        return mockSupabaseQuery({
          data: {
            url: "https://example.supabase.co",
            service_role_enc: "enc",
            bootstrap_status: "ready",
          },
          error: null,
        });
      }
      return mockSupabaseQuery({ data: null, error: null });
    });

    const { rolesHandlers } = await import("../handlers/index.js");
    const result = await callWithInput(
      rolesHandlers.updatePermissions,
      {
        roleId: TEST_IDS.role,
        connectionId: TEST_IDS.connection,
        permissions: [
          {
            table_name: "posts",
            can_read: true,
            can_create: false,
            can_update: false,
            can_delete: false,
          },
        ],
      },
      { context: adminCtx },
    );
    expect(result).toEqual({
      success: true,
      rlsSync: { success: true },
    });
  });

  it("when bootstrap pending, then skips rls sync", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "role_permissions") {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "connections") {
        return mockSupabaseQuery({
          data: {
            url: "https://example.supabase.co",
            service_role_enc: "enc",
            bootstrap_status: "pending",
          },
          error: null,
        });
      }
      return mockSupabaseQuery({ data: null, error: null });
    });

    const { rolesHandlers } = await import("../handlers/index.js");
    const result = await callWithInput(
      rolesHandlers.updatePermissions,
      {
        roleId: TEST_IDS.role,
        connectionId: TEST_IDS.connection,
        permissions: [
          {
            table_name: "posts",
            can_read: true,
            can_create: false,
            can_update: false,
            can_delete: false,
          },
        ],
      },
      { context: adminCtx },
    );
    expect(result).toEqual({
      success: true,
      rlsSync: {
        success: false,
        error: "Target bootstrap is not complete",
      },
    });
  });
});

describe("usersHandlers.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when valid input, then creates user", async () => {
    mockServerFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const { usersHandlers } = await import("../handlers/index.js");
    const result = await callWithInput(
      usersHandlers.create,
      {
        email: "user@example.com",
        password: "password123",
        displayName: "User",
        role: "member",
      },
      { context: adminCtx },
    );
    expect(result.user.email).toBe("user@example.com");
  });
});

describe("provisionHandlers.createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when connection exists, then provisions target user", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "connections") {
        return mockSupabaseQuery({
          data: {
            id: TEST_IDS.connection,
            url: "https://example.supabase.co",
            service_role_enc: "enc",
            bootstrap_status: "ready",
          },
          error: null,
        });
      }
      if (table === "target_user_mappings") {
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      }
      if (table === "profiles") {
        return mockSupabaseQuery({ data: { role: "member" }, error: null });
      }
      return mockSupabaseQuery({ data: null, error: null });
    });

    const { provisionHandlers } = await import("../handlers/index.js");
    const result = await callWithInput(
      provisionHandlers.createUser,
      {
        connectionId: TEST_IDS.connection,
        userId: TEST_IDS.user,
        email: "target@example.com",
        password: "password123",
      },
      { context: adminCtx },
    );
    expect(result.success).toBe(true);
    expect(result.targetUserId).toBe(TEST_IDS.targetUser);
  });

  it("when bootstrap pending, then throws PRECONDITION_FAILED", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "connections") {
        return mockSupabaseQuery({
          data: {
            id: TEST_IDS.connection,
            url: "https://example.supabase.co",
            service_role_enc: "enc",
            bootstrap_status: "pending",
          },
          error: null,
        });
      }
      return mockSupabaseQuery({ data: null, error: null });
    });

    const { provisionHandlers } = await import("../handlers/index.js");
    await expect(
      callWithInput(
        provisionHandlers.createUser,
        {
          connectionId: TEST_IDS.connection,
          userId: TEST_IDS.user,
          email: "target@example.com",
          password: "password123",
        },
        { context: adminCtx },
      ),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});

describe("connectionsRlsHandlers.apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when sync succeeds, then returns success", async () => {
    mockServerFrom.mockReturnValue(
      mockSupabaseQuery({
        data: {
          id: TEST_IDS.connection,
          url: "https://example.supabase.co",
          service_role_enc: "enc",
          bootstrap_status: "ready",
        },
        error: null,
      }),
    );

    const { connectionsRlsHandlers } = await import("../handlers/index.js");
    const result = await callWithInput(
      connectionsRlsHandlers.apply,
      { id: TEST_IDS.connection },
      { context: adminCtx },
    );
    expect(result.success).toBe(true);
  });

  it("when bootstrap pending, then throws PRECONDITION_FAILED", async () => {
    mockServerFrom.mockReturnValue(
      mockSupabaseQuery({
        data: {
          id: TEST_IDS.connection,
          url: "https://example.supabase.co",
          service_role_enc: "enc",
          bootstrap_status: "pending",
        },
        error: null,
      }),
    );

    const { connectionsRlsHandlers } = await import("../handlers/index.js");
    await expect(
      callWithInput(
        connectionsRlsHandlers.apply,
        { id: TEST_IDS.connection },
        { context: adminCtx },
      ),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});

describe("connectionsHandlers.bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when probe ready, then returns ready status", async () => {
    const { probeConnectionBootstrap } = await import("@supa-admin/rls");
    vi.mocked(probeConnectionBootstrap).mockResolvedValueOnce({
      ready: true,
      mode: "supaadmin",
    });

    mockServerFrom.mockReturnValue(
      mockSupabaseQuery({
        data: {
          id: TEST_IDS.connection,
          url: "https://example.supabase.co",
          service_role_enc: "enc",
        },
        error: null,
      }),
    );

    const { connectionsHandlers } = await import("../handlers/index.js");
    const result = await callWithInput(
      connectionsHandlers.bootstrap.probe,
      { id: TEST_IDS.connection },
      { context: adminCtx },
    );
    expect(result).toEqual({ status: "ready" });
  });

  it("when probe pending, then returns setup SQL", async () => {
    const { probeConnectionBootstrap } = await import("@supa-admin/rls");
    vi.mocked(probeConnectionBootstrap).mockResolvedValueOnce({
      ready: false,
      setupSql: "-- setup",
    });

    mockServerFrom.mockReturnValue(
      mockSupabaseQuery({
        data: {
          id: TEST_IDS.connection,
          url: "https://example.supabase.co",
          service_role_enc: "enc",
        },
        error: null,
      }),
    );

    const { connectionsHandlers } = await import("../handlers/index.js");
    const result = await callWithInput(
      connectionsHandlers.bootstrap.probe,
      { id: TEST_IDS.connection },
      { context: adminCtx },
    );
    expect(result).toEqual({ status: "pending", setupSql: "-- setup" });
  });

  it("when apply succeeds, then returns ready", async () => {
    mockServerFrom.mockReturnValue(
      mockSupabaseQuery({
        data: {
          id: TEST_IDS.connection,
          url: "https://example.supabase.co",
          service_role_enc: "enc",
        },
        error: null,
      }),
    );

    const { connectionsHandlers } = await import("../handlers/index.js");
    const result = await callWithInput(
      connectionsHandlers.bootstrap.apply,
      { id: TEST_IDS.connection },
      { context: adminCtx },
    );
    expect(result).toEqual({ success: true, status: "ready" });
  });

  it("when verify fails, then throws BAD_REQUEST with setup SQL", async () => {
    const { verifyConnectionBootstrap } = await import("@supa-admin/rls");
    vi.mocked(verifyConnectionBootstrap).mockResolvedValueOnce({
      success: false,
      error: "exec_sql not found",
      setupSql: "-- manual setup",
    });

    mockServerFrom.mockReturnValue(
      mockSupabaseQuery({
        data: {
          id: TEST_IDS.connection,
          url: "https://example.supabase.co",
          service_role_enc: "enc",
        },
        error: null,
      }),
    );

    const { connectionsHandlers } = await import("../handlers/index.js");
    await expect(
      callWithInput(
        connectionsHandlers.bootstrap.verify,
        { id: TEST_IDS.connection },
        { context: adminCtx },
      ),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      data: { setupSql: "-- manual setup" },
    });
  });
});

describe("connectionsHandlers.target.syncPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when bootstrap ready, then syncs permissions", async () => {
    mockServiceFrom.mockReturnValue(
      mockSupabaseQuery({
        data: {
          url: "https://example.supabase.co",
          service_role_enc: "enc",
          bootstrap_status: "ready",
        },
        error: null,
      }),
    );

    const { connectionsHandlers } = await import("../handlers/index.js");
    const result = await callWithInput(
      connectionsHandlers.target.syncPermissions,
      {
        connectionId: TEST_IDS.connection,
        targetEmail: "target@example.com",
      },
      { context: adminCtx },
    );
    expect(result).toEqual({
      success: true,
      targetUserId: TEST_IDS.targetUser,
    });
  });

  it("when bootstrap pending, then throws PRECONDITION_FAILED", async () => {
    mockServiceFrom.mockReturnValue(
      mockSupabaseQuery({
        data: {
          url: "https://example.supabase.co",
          service_role_enc: "enc",
          bootstrap_status: "pending",
        },
        error: null,
      }),
    );

    const { connectionsHandlers } = await import("../handlers/index.js");
    await expect(
      callWithInput(
        connectionsHandlers.target.syncPermissions,
        {
          connectionId: TEST_IDS.connection,
          targetEmail: "target@example.com",
        },
        { context: adminCtx },
      ),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});

describe("connectionsHandlers.onboarding.status", () => {
  it("when allowed, then returns onboarding steps", async () => {
    const { getConnectionOnboardingStatus } = await import("@supa-admin/rls");
    vi.mocked(getConnectionOnboardingStatus).mockResolvedValueOnce({
      steps: {
        bootstrap: true,
        schemaSynced: false,
        rolesConfigured: false,
        usersProvisioned: false,
      },
      complete: false,
    });

    const { connectionsHandlers } = await import("../handlers/index.js");
    const result = await callWithInput(
      connectionsHandlers.onboarding.status,
      { id: TEST_IDS.connection },
      { context: adminCtx },
    );
    expect(result.complete).toBe(false);
    expect(result.steps.bootstrap).toBe(true);
  });
});

describe("usersHandlers.update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("when roleIds and connectionIds provided, then updates assignments", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "user_roles" || table === "connection_members") {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return mockSupabaseQuery({ data: null, error: null });
    });

    const { usersHandlers } = await import("../handlers/index.js");
    const result = await callWithInput(
      usersHandlers.update,
      {
        id: TEST_IDS.user,
        roleIds: [TEST_IDS.role],
        connectionIds: [TEST_IDS.connection],
      },
      { context: adminCtx },
    );
    expect(result).toEqual({ success: true });
  });
});
