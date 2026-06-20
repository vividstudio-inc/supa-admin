import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
const mockDecrypt = vi.fn();

vi.mock("../src/meta-server.js", () => ({
  createMetaServiceClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

vi.mock("@supa-admin/crypto", () => ({
  decrypt: (...args: unknown[]) => mockDecrypt(...args),
}));

function chainMock(resolved: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(resolved),
    single: vi.fn().mockResolvedValue(resolved),
  };
}

describe("getConnectionAnonKey", () => {
  it("when actor is not platform_admin and not member, then returns null", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return chainMock({ data: { role: "member" }, error: null });
      }
      if (table === "connection_members") {
        return chainMock({ data: null, error: null });
      }
      return chainMock({ data: null, error: null });
    });

    const { getConnectionAnonKey } = await import("../src/connection-keys.js");
    expect(await getConnectionAnonKey("conn-1", "actor-1")).toBeNull();
  });

  it("when platform_admin, then decrypts anon key", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return chainMock({ data: { role: "platform_admin" }, error: null });
      }
      if (table === "connections") {
        return chainMock({ data: { anon_key_enc: "encrypted" }, error: null });
      }
      return chainMock({ data: null, error: null });
    });
    mockDecrypt.mockReturnValue("decrypted-anon-key");

    const { getConnectionAnonKey } = await import("../src/connection-keys.js");
    expect(await getConnectionAnonKey("conn-1", "admin-1")).toBe(
      "decrypted-anon-key",
    );
  });

  it("when member with membership, then decrypts anon key", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return chainMock({ data: { role: "member" }, error: null });
      }
      if (table === "connection_members") {
        return chainMock({ data: { id: "m1" }, error: null });
      }
      if (table === "connections") {
        return chainMock({ data: { anon_key_enc: "encrypted" }, error: null });
      }
      return chainMock({ data: null, error: null });
    });
    mockDecrypt.mockReturnValue("member-anon-key");

    const { getConnectionAnonKey } = await import("../src/connection-keys.js");
    expect(await getConnectionAnonKey("conn-1", "member-1")).toBe(
      "member-anon-key",
    );
  });
});
