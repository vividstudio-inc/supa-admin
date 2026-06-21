import { checkRateLimit } from "@supa-admin/rate-limit/edge";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { env } from "./lib/env";
import {
  isSetupCookieSet,
  SA_SETUP_COOKIE,
  SA_SETUP_COOKIE_OPTIONS,
} from "./lib/setup-cookie";

const intlMiddleware = createMiddleware(routing);

const publicPaths = ["/login", "/setup"];

function applyIntl(request: NextRequest, base: NextResponse) {
  const intlResponse = intlMiddleware(request);
  for (const cookie of base.cookies.getAll()) {
    intlResponse.cookies.set(cookie);
  }
  return intlResponse;
}

function buildContentSecurityPolicy(nonce: string): string {
  const metaUrl = env.NEXT_PUBLIC_META_SUPABASE_URL;
  const extraConnect = process.env.CSP_EXTRA_CONNECT_SRC ?? "";
  const localConnect: string[] = [];
  if (process.env.ALLOW_LOCAL_TARGET_URLS === "true") {
    const targetUrl = process.env.LOCAL_TARGET_SUPABASE_URL;
    if (targetUrl) {
      try {
        const origin = new URL(targetUrl).origin;
        localConnect.push(origin);
        localConnect.push(
          origin.startsWith("https://")
            ? origin.replace(/^https:/, "wss:")
            : origin.replace(/^http:/, "ws:"),
        );
      } catch {
        /* ignore invalid LOCAL_TARGET_SUPABASE_URL */
      }
    }
  }
  const connectSrc = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    metaUrl,
    ...localConnect,
    ...extraConnect
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ].join(" ");

  const scriptSrc =
    process.env.NODE_ENV === "development"
      ? `'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
      : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `connect-src ${connectSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "frame-ancestors 'none'",
  ].join("; ");
}

function resolveClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

async function isSetupCompleteViaService(): Promise<boolean> {
  const service = createClient(
    env.NEXT_PUBLIC_META_SUPABASE_URL,
    env.META_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data } = await service
    .from("app_settings")
    .select("value")
    .eq("key", "setup_complete")
    .single();
  return data?.value === true || data?.value?.toString() === "true";
}

function setSetupCookie(response: NextResponse) {
  response.cookies.set(SA_SETUP_COOKIE, "1", SA_SETUP_COOKIE_OPTIONS);
}

function withSecurityHeaders(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const rewrite = response.headers.get("x-middleware-rewrite");
  const location = response.headers.get("location");

  let secured: NextResponse;
  if (location) {
    secured = NextResponse.redirect(
      new URL(location, request.url),
      response.status,
    );
  } else if (rewrite) {
    secured = NextResponse.rewrite(new URL(rewrite, request.url), {
      request: { headers: requestHeaders },
    });
  } else if (response.status !== 200 && response.status !== 0) {
    secured = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } else {
    secured = NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  for (const cookie of response.cookies?.getAll?.() ?? []) {
    secured.cookies.set(cookie);
  }

  secured.headers.set("X-Frame-Options", "DENY");
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  secured.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  secured.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  secured.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy(nonce),
  );
  return secured;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const localeFreePath = pathname.replace(/^\/(ja|en)/, "") || "/";

  const isPublic = publicPaths.some(
    (p) => localeFreePath === p || localeFreePath.startsWith(`${p}/`),
  );

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_META_SUPABASE_URL,
    env.NEXT_PUBLIC_META_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let setupComplete = isSetupCookieSet(
    request.cookies.get(SA_SETUP_COOKIE)?.value,
  );
  if (!setupComplete && user) {
    setupComplete = await isSetupCompleteViaService();
    if (setupComplete) {
      setSetupCookie(supabaseResponse);
    }
  }

  if (localeFreePath === "/setup") {
    const rate = await checkRateLimit(
      `setup-page:${resolveClientIp(request)}`,
      30,
      60,
    );
    if (!rate.allowed) {
      return withSecurityHeaders(
        request,
        new NextResponse("Too Many Requests", { status: 429 }),
      );
    }

    if (setupComplete && user) {
      const redirect = NextResponse.redirect(new URL("/", request.url));
      for (const cookie of supabaseResponse.cookies.getAll()) {
        redirect.cookies.set(cookie);
      }
      return withSecurityHeaders(request, redirect);
    }
    if (setupComplete && !user) {
      const redirect = NextResponse.redirect(new URL("/login", request.url));
      for (const cookie of supabaseResponse.cookies.getAll()) {
        redirect.cookies.set(cookie);
      }
      return withSecurityHeaders(request, redirect);
    }
    return withSecurityHeaders(request, applyIntl(request, supabaseResponse));
  }

  if (!isPublic && !user) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return withSecurityHeaders(request, redirect);
  }

  if (localeFreePath === "/login" && user) {
    const redirect = NextResponse.redirect(new URL("/", request.url));
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return withSecurityHeaders(request, redirect);
  }

  if (!isPublic && user && localeFreePath === "/") {
    if (!setupComplete) {
      const redirect = NextResponse.redirect(new URL("/setup", request.url));
      for (const cookie of supabaseResponse.cookies.getAll()) {
        redirect.cookies.set(cookie);
      }
      return withSecurityHeaders(request, redirect);
    }
  }

  return withSecurityHeaders(request, applyIntl(request, supabaseResponse));
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
