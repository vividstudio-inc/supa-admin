import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockFindById = vi.fn();
const mockList = vi.fn();
const mockCreate = vi.fn();
const mockDelete = vi.fn();
const mockListTables = vi.fn();
const mockReplaceTables = vi.fn();
const mockUpdateSchemaCachedAt = vi.fn();
const mockIsConnectionMember = vi.fn();
const mockConnectionExists = vi.fn();
const mockFindConnectionCredentials = vi.fn();
const mockGetMemberConnectionIds = vi.fn();

vi.mock("@supa-admin/repository-kit", () => ({
  createDbContext: vi.fn(async () => ({ db: {}, mode: "service" })),
  createConnectionRepository: vi.fn(() => ({
    findById: mockFindById,
    list: mockList,
    create: mockCreate,
    delete: mockDelete,
    listTables: mockListTables,
    replaceTables: mockReplaceTables,
    updateSchemaCachedAt: mockUpdateSchemaCachedAt,
  })),
  createAccessRepository: vi.fn(() => ({
    getMemberConnectionIds: mockGetMemberConnectionIds,
  })),
  isConnectionMember: (...args: unknown[]) => mockIsConnectionMember(...args),
  connectionExists: (...args: unknown[]) => mockConnectionExists(...args),
  findConnectionCredentials: (...args: unknown[]) =>
    mockFindConnectionCredentials(...args),
}));

const mockFetchSchema = vi.fn();
vi.mock("@supa-admin/schema", () => ({
  fetchSchemaViaRest: (...args: unknown[]) => mockFetchSchema(...args),
}));

const mockEncrypt = vi.fn((v: string) => `enc-${v}`);
vi.mock("@supa-admin/crypto", () => ({
  encrypt: (v: string) => mockEncrypt(v),
}));

const mockProbe = vi.fn();
const mockExecuteBootstrap = vi.fn();
const mockVerifyBootstrap = vi.fn();
vi.mock("@supa-admin/rls", () => ({
  probeConnectionBootstrap: (...args: unknown[]) => mockProbe(...args),
  executeTargetBootstrap: (...args: unknown[]) => mockExecuteBootstrap(...args),
  verifyConnectionBootstrap: (...args: unknown[]) =>
    mockVerifyBootstrap(...args),
}));

vi.mock("@supa-admin/utils", () => ({
  validateTargetUrl: vi.fn(() => ({ ok: true as const })),
}));

const connectionRow = {
  id: "conn-1",
  name: "Demo",
  url: "https://demo.supabase.co",
  anon_key_enc: "enc-anon",
  service_role_enc: "enc-service",
  bootstrap_status: "pending" as const,
  bootstrap_verified_at: null,
  schema_cached_at: null,
  created_by: null,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  webhook_secret_enc: "secret",
};

describe("feature-connections application", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockResolvedValue(connectionRow);
    mockListTables.mockResolvedValue([]);
    mockList.mockResolvedValue([{ id: "conn-1", name: "Demo" }]);
    mockFetchSchema.mockResolvedValue({
      tables: [{ table_name: "posts", columns: [] }],
      error: null,
    });
    mockCreate.mockResolvedValue(connectionRow);
    mockProbe.mockResolvedValue({ ready: false, setupSql: "SELECT 1" });
    mockFindConnectionCredentials.mockResolvedValue({
      url: "https://demo.supabase.co",
      serviceRoleEnc: "enc-service",
      bootstrapStatus: "pending",
    });
    mockIsConnectionMember.mockResolvedValue(true);
    mockConnectionExists.mockResolvedValue(true);
    mockGetMemberConnectionIds.mockResolvedValue(["conn-1"]);
  });

  it("createConnection persists connection and caches schema when tables exist", async () => {
    const { createConnection } = await import(
      "../src/application/create-connection"
    );
    const result = await createConnection({
      name: "Demo",
      url: "https://demo.supabase.co/",
      anonKey: "anon",
      serviceRoleKey: "service",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(mockCreate).toHaveBeenCalled();
    expect(mockReplaceTables).toHaveBeenCalled();
    expect(mockUpdateSchemaCachedAt).toHaveBeenCalled();
    expect(result.value.setupSql).toBe("SELECT 1");
  });

  it("createConnection returns err when schema fetch fails with no tables", async () => {
    mockFetchSchema.mockResolvedValue({ tables: [], error: "unreachable" });
    const { createConnection } = await import(
      "../src/application/create-connection"
    );
    const result = await createConnection({
      name: "Demo",
      url: "https://demo.supabase.co",
      anonKey: "anon",
      serviceRoleKey: "service",
    });
    expect(result.ok).toBe(false);
  });

  it("getAccessibleConnection allows platform_admin and returns connection", async () => {
    const { getAccessibleConnection } = await import(
      "../src/application/get-accessible-connection"
    );
    const result = await getAccessibleConnection(
      "conn-1",
      "user-1",
      "platform_admin",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.connection.id).toBe("conn-1");
  });

  it("getAccessibleConnection forbids member without membership", async () => {
    mockIsConnectionMember.mockResolvedValue(false);
    const { getAccessibleConnection } = await import(
      "../src/application/get-accessible-connection"
    );
    const result = await getAccessibleConnection("conn-1", "user-1", "member");
    expect(result.ok).toBe(false);
  });

  it("userCanAccessConnection checks membership for members", async () => {
    const { userCanAccessConnection } = await import(
      "../src/application/get-accessible-connection"
    );
    expect(await userCanAccessConnection("conn-1", "user-1", "member")).toBe(
      true,
    );
    mockGetMemberConnectionIds.mockResolvedValue([]);
    expect(await userCanAccessConnection("conn-2", "user-1", "member")).toBe(
      false,
    );
  });

  it("listConnections delegates to repository list", async () => {
    const { listConnections } = await import(
      "../src/application/list-connections"
    );
    const rows = await listConnections();
    expect(rows).toHaveLength(1);
    expect(mockList).toHaveBeenCalled();
  });

  it("getConnection returns not found when missing", async () => {
    mockFindById.mockResolvedValue(null);
    const { getConnection } = await import("../src/application/get-connection");
    const result = await getConnection("missing");
    expect(result.ok).toBe(false);
  });

  it("deleteConnection removes connection", async () => {
    const { deleteConnection } = await import(
      "../src/application/delete-connection"
    );
    const result = await deleteConnection("conn-1");
    expect(result.ok).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith("conn-1");
  });

  it("bootstrapProbe returns pending with setupSql when not ready", async () => {
    const { bootstrapProbe } = await import(
      "../src/application/bootstrap-probe"
    );
    const result = await bootstrapProbe("conn-1");
    expect(result.status).toBe("pending");
    expect(result.setupSql).toBe("SELECT 1");
  });

  it("bootstrapProbe executes bootstrap when ready", async () => {
    mockProbe.mockResolvedValue({ ready: true });
    const { bootstrapProbe } = await import(
      "../src/application/bootstrap-probe"
    );
    const result = await bootstrapProbe("conn-1");
    expect(result.status).toBe("ready");
    expect(mockExecuteBootstrap).toHaveBeenCalled();
  });

  it("bootstrapApply throws when bootstrap fails", async () => {
    mockExecuteBootstrap.mockResolvedValue({ success: false, error: "fail" });
    const { bootstrapApply } = await import(
      "../src/application/bootstrap-apply"
    );
    await expect(bootstrapApply("conn-1")).rejects.toThrow("fail");
  });

  it("bootstrapVerify throws with setupSql metadata on failure", async () => {
    mockVerifyBootstrap.mockResolvedValue({
      success: false,
      error: "not ready",
      setupSql: "SQL",
    });
    const { bootstrapVerify } = await import(
      "../src/application/bootstrap-verify"
    );
    await expect(bootstrapVerify("conn-1")).rejects.toMatchObject({
      message: "not ready",
    });
  });
});
