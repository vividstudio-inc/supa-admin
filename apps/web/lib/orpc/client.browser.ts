import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { SimpleCsrfProtectionLinkPlugin } from "@orpc/client/plugins";
import type { ContractRouterClient } from "@orpc/contract";
import type { Contract } from "@supa-admin/orpc-contract";

const link = new RPCLink({
  url: () =>
    typeof window === "undefined"
      ? `${process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000"}/api/rpc`
      : `${window.location.origin}/api/rpc`,
  fetch: async (request, init) => {
    const response = await fetch(request, init);
    if (response.status === 401 && typeof window !== "undefined") {
      const from = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?from=${from}`;
    }
    return response;
  },
  plugins: [new SimpleCsrfProtectionLinkPlugin()],
});

export const orpcBrowser: ContractRouterClient<Contract> =
  createORPCClient(link);
