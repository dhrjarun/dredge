import { serve } from "@hono/node-server";
import { Server } from "http";
import { Hono } from "hono";
import {
  CreateFetchRequestHandlerOptions,
  createFetchRequestHandler,
} from "../../source/fetch";

export async function startServer(
  opts: Omit<CreateFetchRequestHandlerOptions<any>, "req">,
): Promise<Server> {
  const app = new Hono();
  const handler = createFetchRequestHandler({
    ...opts,
  });

  app.all("*", async (c) => {
    const res = await handler(c.req.raw);
    c.res = res;
    c.res.headers.delete("Content-Length"); // Because of `FetchError: request to ... failed, reason: Parse Error: Duplicate Content-Length`
  });

  const server = serve({
    fetch: app.fetch,
  });

  return new Promise((resolve, reject) => {
    server.addListener("error", (err) => {
      reject(err);
    });
    server.addListener("listening", () => {
      resolve(server as any);
    });
    server.listen();
  });
}
