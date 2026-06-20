import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@supa-admin/crypto", () => ({
  decrypt: vi.fn((value: string) => `decrypted:${value}`),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ auth: {} })),
}));

describe("createTargetAdminClient", () => {
  it("when called, then decrypts service role and creates client", async () => {
    const { createTargetAdminClient } = await import("../src/admin.js");
    const { createClient } = await import("@supabase/supabase-js");

    createTargetAdminClient("https://example.supabase.co", "enc");
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "decrypted:enc",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  });
});

describe("createTargetAnonClient", () => {
  it("when called, then decrypts anon key and creates client", async () => {
    const { createTargetAnonClient } = await import("../src/admin.js");
    const { createClient } = await import("@supabase/supabase-js");

    createTargetAnonClient("https://example.supabase.co/", "enc-anon");
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co/",
      "decrypted:enc-anon",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  });
});
