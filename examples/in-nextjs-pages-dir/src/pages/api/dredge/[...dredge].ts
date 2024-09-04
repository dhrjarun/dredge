import { db } from "@/db";
import { rootRouter } from "@/router";

// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createNodeHttpRequestHandler } from "dredge-adapters";

const handler = createNodeHttpRequestHandler({
  ctx: {
    db: db,
  },
  router: rootRouter,
  prefixUrl: "/api/dredge",
});

export default handler;
