import { serve } from "@hono/node-server";
import { Server } from "http";
import { Hono } from "hono";
import {
  HandleFetchRequestOptions,
  handleFetchRequest,
} from "../../source/fetch";

export async function startServer(
  opts: Omit<HandleFetchRequestOptions<any>, "req">,
): Promise<Server> {
  const app = new Hono();

  app.all("*", async (c) => {
    const res = await handleFetchRequest({
      ...opts,
      req: c.req.raw,
    });

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
      const port = (server.address() as any)?.port;
      const baseUrl = `http://localhost:${port}`;

      resolve(server as any);
    });
    server.listen();
  });
}
