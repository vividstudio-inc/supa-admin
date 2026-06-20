import { RPCHandler } from "@orpc/server/fetch";
import { SimpleCsrfProtectionHandlerPlugin } from "@orpc/server/plugins";
import { createOrpcContextFromRequest } from "@/lib/orpc/context";
import { router } from "@/lib/orpc/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = new RPCHandler(router, {
  plugins: [new SimpleCsrfProtectionHandlerPlugin()],
});

async function handleRequest(request: Request): Promise<Response> {
  const context = await createOrpcContextFromRequest(request);
  const { matched, response } = await handler.handle(request, {
    prefix: "/api/rpc",
    context,
  });

  if (matched && response) return response;
  return new Response("Not Found", { status: 404 });
}

export const GET = handleRequest;
export const POST = handleRequest;
export const PUT = handleRequest;
export const PATCH = handleRequest;
export const DELETE = handleRequest;
