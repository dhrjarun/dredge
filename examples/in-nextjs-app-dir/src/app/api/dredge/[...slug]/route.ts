import { rootRouter } from "@/router";
import { createFetchRequestHandler } from "dredge-adapters";

async function handler(req: Request) {
  const handler = createFetchRequestHandler({
    prefixUrl: "/api/dredge",
    router: rootRouter,
  });

  return handler(req);
}

export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as PUT,
  handler as DELETE,
  handler as OPTIONS,
  handler as HEAD,
};
