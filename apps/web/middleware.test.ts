import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { value: true } }),
    })),
  })),
}));

vi.mock("@supa-admin/rate-limit/edge", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}));

vi.mock("next-intl/middleware", () => ({
  default: vi.fn(() =>
    vi.fn((request: NextRequest) => {
      const pathname = new URL(request.url).pathname;
      if (pathname === "/setup" || pathname === "/login") {
        return NextResponse.rewrite(new URL(`/ja${pathname}`, request.url));
      }
      return NextResponse.next();
    }),
  ),
}));

vi.mock("./lib/env", () => ({
  env: {
    NEXT_PUBLIC_META_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_META_SUPABASE_ANON_KEY: "anon-key",
    META_SUPABASE_SERVICE_ROLE_KEY: "service-key",
  },
}));

describe("middleware", () => {
  it("when unauthenticated on protected path, then redirects to login", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { middleware } = await import("./middleware.js");
    const request = new NextRequest(new URL("http://localhost/en/connections"));
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("when authenticated on login, then redirects to home", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const { middleware } = await import("./middleware.js");
    const request = new NextRequest(new URL("http://localhost/en/login"), {
      headers: { cookie: "sa_setup=1" },
    });
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("localhost");
  });

  it("when unauthenticated on setup, then preserves locale rewrite", async () => {
    vi.stubEnv("ALLOW_LOCAL_TARGET_URLS", "true");
    vi.stubEnv("LOCAL_TARGET_SUPABASE_URL", "http://127.0.0.1:54421");
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { middleware } = await import("./middleware.js");
    const request = new NextRequest(new URL("http://localhost/setup"));
    const response = await middleware(request);

    expect(response.headers.get("x-middleware-rewrite")).toContain("/ja/setup");
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "http://127.0.0.1:54421",
    );
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "ws://127.0.0.1:54421",
    );
  });

  it("when setup cookie set, then does not query anon app_settings", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const { createClient } = await import("@supabase/supabase-js");

    const { middleware } = await import("./middleware.js");
    const request = new NextRequest(new URL("http://localhost/en/"), {
      headers: { cookie: "sa_setup=1" },
    });
    await middleware(request);

    expect(createClient).not.toHaveBeenCalled();
  });
});
