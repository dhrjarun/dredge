# Adapters

Dredge is not a server on its own. It uses adapters to serve the API. Adapters take similar options, like `router`, `prefixUrl`, `ctx` (which is the initial context). There are adapters available for Node, Fetch.

## Standalone Server

```ts
import { createHTTPServer } from 'dredge-adapters'
import { rootRouter } from './root-router'

const server = createHTTPServer({
    router: rootRouter,
    prefixUrl: '/api/dredge',
})
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

## Express

```ts
import { createNodeHttpRequestHandler } from "dredge-adapters";
import { rootRouter } from "./root-router";
import express from "express";

const app = express()
const port = 3000

const handler = createNodeHttpRequestHandler({
    router: rootRouter,
    prefixUrl: '/api/dredge',
})

app.get('/api/dredge', handler)

app.listen(port, () => {
  console.log(`listening on port ${port}`)
})
```


