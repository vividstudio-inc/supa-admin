import "server-only";
import { call } from "@orpc/server";
import { headers } from "next/headers";
import { cache } from "react";
import { createOrpcContextFromRequest } from "./context";

export const getServerCaller = cache(async () => {
  const headerList = await headers();
  const request = new Request("http://localhost", {
    headers: headerList,
  });
  const context = await createOrpcContextFromRequest(request);

  return {
    context,
    call: <TProcedure, TInput>(procedure: TProcedure, input: TInput) =>
      call(procedure as Parameters<typeof call>[0], input, {
        context,
      }),
    callWithoutInput: <TProcedure>(procedure: TProcedure) =>
      call(procedure as Parameters<typeof call>[0], undefined, {
        context,
      }),
  };
});
