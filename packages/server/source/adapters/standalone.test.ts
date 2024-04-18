import type { AddressInfo } from "net";
import { test, expect } from "vitest";
import { dredge } from "../dredge";
import z from "zod";
import { createHTTPServer, CreateHTTPServerOptions } from "./standalone";
import { createFetchClient } from "@dredge/client";

const { route, api } = dredge();

const testApi = api([
  route
    .path("posts", ":user")
    .params({
      user: z.enum(["dhrjarun", "dd"]),
    })
    .searchParam({
      size: z.string(),
    })
    .post(
      z.object({
        age: z.number(),
      })
    )
    .resolve(({ send, data }) => {
      return send({
        data,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }),

  route
    .path("posts")
    .get()
    .resolve(({ send }) => {
      return send({ data: "I am post" });
    }),
]);

let server: ReturnType<typeof createHTTPServer>;
async function startServer(
  opts: CreateHTTPServerOptions<any> & {
    port?: number;
    hostname?: string;
  }
): Promise<{
  port: number;
  address: string;
}> {
  server = createHTTPServer(opts);

  // NOTE: Using custom hostname requires awaiting for `listening` event.
  // Prior to this event, it's not possible to retrieve resolved `port` and `address` values.
  return new Promise((resolve, reject) => {
    server.addListener("error", (err) => {
      reject(err);
    });
    server.addListener("listening", () => {
      resolve({
        ...(server.address() as AddressInfo),
      });
    });
    server.listen(opts.port, opts.hostname ?? "127.0.0.1");
  });
}

test("standalone server", async () => {
  const prefixUrl = new URL("http://localhost:4040");
  const { port, address } = await startServer({
    api: testApi,
    ctx: {},
    prefixUrl,
    hostname: prefixUrl.hostname,
    port: Number(prefixUrl.port),
  });
  console.log("port and address", port, address);

  const {
    default: fetch,
    Headers,
    Request,
    Response,
  } = await import("node-fetch");
  globalThis.fetch = fetch;
  globalThis.Request = Request;
  globalThis.Headers = Headers;
  globalThis.Response = Response;

  const client = createFetchClient<typeof testApi>({
    prefixUrl,
    fetch,
    headers: {
      "Content-Type": "application/json",
    },
  });

  // expect(await client.get("/posts", {}).data()).toMatchObject({
  //   data: "I am post",
  // });
  const response = await client.post("/posts/dhrjarun", {
    data: {
      age: 20,
    },
    searchParams: {
      size: "no-size",
    },
  });
  expect(await response.data()).toMatchObject({
    age: 20,
  });
});
