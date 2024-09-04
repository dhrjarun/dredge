import { rootRouter } from "@/router";
import { handleFetchRequest } from "dredge-adapters";

async function handler(req: Request) {
  const res = await handleFetchRequest({
    req,
    router: rootRouter,
    prefixUrl: "/api/dredge",
  });

  return res;
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
