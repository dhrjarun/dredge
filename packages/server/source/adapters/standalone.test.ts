import type { AddressInfo } from "net";
import { test, expect, afterEach } from "vitest";
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
      }),
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
      return send({
        data: {
          say: "I am Post",
        },
        headers: {
          "Content-Type": "application/json",
        },
      });
    }),

  route
    .path("form")
    .post(
      z.object({
        name: z.string(),
        file: z.instanceof(Blob),
      }),
    )
    .resolve(({ send, data }) => {
      return send({
        data,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    }),
]);

let server: ReturnType<typeof createHTTPServer>;
async function startServer(
  opts: CreateHTTPServerOptions<any> & {
    port?: number;
    hostname?: string;
  },
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

afterEach(() => {
  server.close();
});
const prefixUrl = new URL("http://localhost:4040");

const client = createFetchClient<typeof testApi>({
  prefixUrl,
  fetch: globalThis.fetch,
  headers: {
    "Content-Type": "application/json",
  },
});

test("standalone server", async () => {
  await startServer({
    api: testApi,
    ctx: {},
    prefixUrl,
    hostname: prefixUrl.hostname,
    port: Number(prefixUrl.port),
  });

  const data = await client.get("/posts", {}).data();
  expect(data).toMatchObject({ say: "I am Post" });

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

test("formdata", async () => {
  await startServer({
    api: testApi,
    ctx: {},
    prefixUrl,
    hostname: prefixUrl.hostname,
    port: Number(prefixUrl.port),
  });

  const data = await client
    .post("/form", {
      data: {
        name: "fileName",
        file: new Blob(["good file"], {}),
      },
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    .data();

  expect(await data.file.text()).toBe("good file");
});
