import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("next-intl/middleware", () => ({
  default: vi.fn(() => new Response(null, { status: 200 })),
}));

vi.mock("./lib/env", () => ({
  env: {
    NEXT_PUBLIC_META_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_META_SUPABASE_ANON_KEY: "anon-key",
  },
}));

function chain(resolved: { data: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolved),
  };
}

describe("middleware", () => {
  it("when unauthenticated on protected path, then redirects to login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockFrom.mockReturnValue(chain({ data: { value: true } }));

    const { middleware } = await import("./middleware.js");
    const request = new NextRequest(new URL("http://localhost/en/connections"));
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("when authenticated on login, then redirects to home", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFrom.mockReturnValue(chain({ data: { value: true } }));

    const { middleware } = await import("./middleware.js");
    const request = new NextRequest(new URL("http://localhost/en/login"));
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("localhost");
  });
});
