import { RPCHandler } from "@orpc/server/fetch";
import { SimpleCsrfProtectionHandlerPlugin } from "@orpc/server/plugins";
import { checkRateLimit } from "@supa-admin/rate-limit";
import { createOrpcContextFromRequest } from "@/lib/orpc/context";
import { router } from "@/lib/orpc/router";
import { SA_SETUP_COOKIE, SA_SETUP_COOKIE_OPTIONS } from "@/lib/setup-cookie";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = new RPCHandler(router, {
  plugins: [new SimpleCsrfProtectionHandlerPlugin()],
});

async function handleRequest(request: Request): Promise<Response> {
  const context = await createOrpcContextFromRequest(request);

  const rateKey = context.actorId
    ? `rpc:${context.clientIp}:${context.actorId}`
    : `rpc:${context.clientIp}`;
  const rate = await checkRateLimit(rateKey, 100, 60);
  if (!rate.allowed) {
    return new Response(JSON.stringify({ message: "Rate limit exceeded" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...(rate.retryAfterSec
          ? { "Retry-After": String(rate.retryAfterSec) }
          : {}),
      },
    });
  }

  const { matched, response } = await handler.handle(request, {
    prefix: "/api/rpc",
    context,
  });

  if (matched && response) {
    const url = new URL(request.url);
    if (
      url.pathname.endsWith("/setup/create-admin") &&
      response.ok &&
      request.method === "POST"
    ) {
      const next = new Response(response.body, response);
      next.headers.set(
        "Set-Cookie",
        `${SA_SETUP_COOKIE}=1; Path=${SA_SETUP_COOKIE_OPTIONS.path}; HttpOnly; SameSite=Lax${SA_SETUP_COOKIE_OPTIONS.secure ? "; Secure" : ""}; Max-Age=${SA_SETUP_COOKIE_OPTIONS.maxAge}`,
      );
      return next;
    }
    return response;
  }
  return new Response("Not Found", { status: 404 });
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
