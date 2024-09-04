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
