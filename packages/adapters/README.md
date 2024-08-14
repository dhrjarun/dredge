# dredge-adapters


## Install
```
npm install dredge-adapters
```

## Usage

```ts
// standalone server
import { createHTTPServer } from 'dredge-adapters'
import { rootRouter } from './root-router'

const server = createServer({
    router: rootRouter,
    ctx: {},
})

server.listen(3000)
```

```ts
// using express
import express from "express";
import { dredgeRouter, dredgeRoute } from "dredge-route";
import {
  createNodeHttpRequestHandler,
} from "dredge-adapters";
import { rootRouter } from "./router";

const app = express();

app.use((req, res) => {
  const handler = createNodeHttpRequestHandler({
    router: rootRouter,
    ctx: {},
    dataSerializers: {
      "application/json": async ({ data }) => {
        return JSON.stringify(data);
      },
    },
    bodyParsers: {
      "application/json": async ({ text }) => {
        return JSON.parse(await text());
      },
    },
    prefixUrl: "http://localhost:3000",
  });

  handler(req, res);
});


app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
```



