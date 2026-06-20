import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { env } from "./lib/env";

const intlMiddleware = createMiddleware(routing);

const publicPaths = ["/login", "/setup"];

function applyIntl(request: NextRequest, base: NextResponse) {
  const intlResponse = intlMiddleware(request);
  for (const cookie of base.cookies.getAll()) {
    intlResponse.cookies.set(cookie);
  }
  return intlResponse;
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

  if (localeFreePath === "/setup") {
    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "setup_complete")
      .single();

    const setupComplete =
      settings?.value === true || settings?.value?.toString() === "true";

    if (setupComplete && user) {
      const redirect = NextResponse.redirect(new URL("/", request.url));
      for (const cookie of supabaseResponse.cookies.getAll()) {
        redirect.cookies.set(cookie);
      }
      return redirect;
    }
    if (setupComplete && !user) {
      const redirect = NextResponse.redirect(new URL("/login", request.url));
      for (const cookie of supabaseResponse.cookies.getAll()) {
        redirect.cookies.set(cookie);
      }
      return redirect;
    }
    return applyIntl(request, supabaseResponse);
  }

  if (!isPublic && !user) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  if (localeFreePath === "/login" && user) {
    const redirect = NextResponse.redirect(new URL("/", request.url));
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }

  if (!isPublic && user && localeFreePath === "/") {
    const { data: settings } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "setup_complete")
      .single();

    const setupComplete =
      settings?.value === true || settings?.value?.toString() === "true";

    if (!setupComplete) {
      const redirect = NextResponse.redirect(new URL("/setup", request.url));
      for (const cookie of supabaseResponse.cookies.getAll()) {
        redirect.cookies.set(cookie);
      }
      return redirect;
    }
  }

  return applyIntl(request, supabaseResponse);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
