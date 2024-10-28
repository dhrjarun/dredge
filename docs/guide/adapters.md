# Adapters

Dredge is not a server on its own. It uses adapters to serve the API. Adapters take similar options, like `router`, `prefixUrl`, `ctx` (which is the initial context). There are adapters available for Node, Fetch.

## Standalone Server

```ts
// server.ts
import { createHTTPServer } from "dredge-adapters";
import { rootRouter } from "./router";

const server = createHTTPServer({
  router: rootRouter,
  prefixUrl: "/api/dredge",
});

server.addListener("error", (err: any) => {
  console.log("Something went wrong", err);
});

server.addListener("listening", () => {
  const port = (server.address() as any)?.port;

  console.log(`listening on port ${port}`);
});

server.listen(3000);

```

## NextJS Page Directory

```ts
// pages/api/dredge/[...dredge].ts

import { createNodeHttpRequestHandler } from "dredge-adapters";
import { rootRouter } from "@/router";

const handler = createNodeHttpRequestHandler({
  router: rootRouter,
  prefixUrl: "/api/dredge",
});

export default handler;

```

## NextJS App Directory

```ts
// app/api/dredge/[...slug]/route.ts
import { rootRouter } from "@/router";
import { createFetchRequestHandler } from "dredge-adapters";

async function handler(req: Request) {
  const handler = createFetchRequestHandler({
    prefixUrl: "/api/dredge",
    router: rootRouter,
  });

  const res = await handler(req);
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
```

## Express

```ts
// server.ts
import { createNodeHttpRequestHandler } from "dredge-adapters";
import express from "express";
import { rootRouter } from "./router";

const app = express();
const port = 3000;

const handler = createNodeHttpRequestHandler({
  router: rootRouter,
  prefixUrl: "/api/dredge/",
});

app.get("/api/dredge/*", async (req, res) => {
  console.log("req.url", req.url);
  await handler(req, res);
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
```


