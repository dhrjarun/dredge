import { Server } from "http";
import { trimSlashes } from "dredge-common";
import { dredgeRoute, dredgeRouter } from "dredge-route";
import fetch, {} from "node-fetch";
import { afterEach, expect, test } from "vitest";
import z from "zod";
import {
  CreateHTTPServerOptions,
  createHTTPServer,
} from "../source/standalone";

let server: ReturnType<typeof createHTTPServer>;

let baseUrl: string;
let client: (url: string, init?: fetch.RequestInit) => Promise<fetch.Response>;
async function startServer(opts: CreateHTTPServerOptions<any>): Promise<{
  server: Server;
  client: typeof client;
}> {
  server = createHTTPServer({
    dataSerializers: {
      "application/json": async ({ data }) => {
        return JSON.stringify(data);
      },
      "text/plain": async ({ data }) => {
        if (typeof data === "string") return data;
        return "";
      },
    },
    bodyParsers: {
      "application/json": async ({ text }) => {
        const payload = await text();
        if (!payload) return;
        return JSON.parse(payload);
      },
      "text/plain": async ({ text }) => {
        const payload = await text();
        if (!payload) return;
        return payload;
      },
    },
    ...opts,
  });

  return new Promise((resolve, reject) => {
    server.addListener("error", (err) => {
      reject(err);
    });
    server.addListener("listening", () => {
      const port = (server.address() as any)?.port;
      baseUrl = `http://localhost:${port}`;

      client = (url: string, options: any) => {
        return fetch(baseUrl + "/" + trimSlashes(url), options);
      };

      resolve({ server, client });
    });
    server.listen();
  });
}

const route = dredgeRoute().options({
  dataTypes: {
    json: "application/json",
    text: "text/plain",
  },
});

afterEach(() => {
  server.close();
});

test("JSON bodyParse and dataStringify", async () => {
  const { client } = await startServer({
    router: dredgeRouter([
      route
        .path("/success")
        .post()
        .use((req, res) => {
          return res.end({
            status: 200,
            json: {
              ...req.data,
            },
          });
        })
        .build(),

      route
        .path("/error")
        .post()
        .use((req, res) => {
          throw "error";
        })
        .error((err, req, res) => {
          return res.end({
            status: 500,
            json: {
              ...req.data,
            },
          });
        })
        .build(),
    ]),
  });

  const data = {
    number: 1,
    string: "test",
    boolean: true,
    array: ["a", "b", "c"],
  };

  const successResponse = await client("success", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  expect(successResponse.status).toBe(200);
  expect(await successResponse.json()).toMatchObject(data);

  const errorResponse = await client("error", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  expect(errorResponse.status).toBe(500);
  expect(await errorResponse.json()).toMatchObject(data);
});

test("get route", async () => {
  const data = {
    number: 1,
    string: "test",
    boolean: true,
    array: ["a", "b", "c"],
  };

  await startServer({
    router: dredgeRouter([
      dredgeRoute()
        .options({
          dataTypes: {
            json: "application/json",
          },
        })
        .path("/fruits")
        .get()
        .use((req, res) => {
          return res.end({
            json: data,
          });
        })
        .build(),
    ]),
  });

  const response = await client("/fruits", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject(data);
});

test("when res.data is undefined", async () => {
  const { client } = await startServer({
    router: dredgeRouter([
      dredgeRoute()
        .path("/test-I")
        .get()
        .use((req, res) => {
          return res.end({
            status: 200,
          });
        })
        .build(),
      dredgeRoute()
        .path("/test-II")
        .get()
        .use((req, res) => {})
        .build(),
    ]),
  });

  const responseI = await client("test-I", {
    method: "GET",
  });

  const responseII = await client("test-I", {
    method: "GET",
  });

  expect(responseI.status).toBe(200);
  expect(await responseI.text()).toBe("");
});

test("deserializeParams", async () => {
  await startServer({
    router: dredgeRouter([
      route
        .path("/test/:param")
        .get()
        .use((req, res) => {
          return res.end({
            status: 200,
            json: req.param(),
          });
        })
        .build(),
    ]),

    deserializeParams: (params) => {
      const newParams: Record<string, any> = {};
      Object.entries(params).forEach(([key, value]) => {
        if (key === "param") {
          newParams[key] = `ds-${value}`;
        }
      });

      return newParams;
    },
  });

  expect(
    await (
      await client("/test/p", {
        method: "GET",
      })
    ).json(),
  ).toStrictEqual({
    param: "ds-p",
  });

  expect(
    await (
      await client("/test/pp", {
        method: "GET",
      })
    ).json(),
  ).toStrictEqual({
    param: "ds-pp",
  });
});

test("deserializeSearchParams", async () => {
  await startServer({
    router: dredgeRouter([
      route
        .path("/test")
        .searchParams({
          a: z.string(),
          b: z.string(),
        })
        .get()
        .use((req, res) => {
          return res.end({
            status: 200,
            json: {
              single: req.searchParam(),
              multiple: req.searchParams(),
            },
          });
        })
        .build(),
    ]),

    deserializeSearchParams: (searchParams) => {
      const newSearchParams: Record<string, any> = {};
      Object.entries(searchParams).forEach(([key, value]) => {
        newSearchParams[key] = [];

        value.forEach((v) => {
          newSearchParams[key].push(`ds-${v}`);
        });
      });

      return newSearchParams;
    },
  });

  const text = await (
    await client("/test?a=apple&b=ball&b=banana&a=airplane", {
      method: "GET",
    })
  ).text();

  expect(
    await (
      await client("/test?a=apple&b=ball&b=banana&a=airplane", {
        method: "GET",
      })
    ).json(),
  ).toStrictEqual({
    single: {
      a: "ds-apple",
      b: "ds-ball",
    },
    multiple: {
      a: ["ds-apple", "ds-airplane"],
      b: ["ds-ball", "ds-banana"],
    },
  });
});

test("parseBody", async () => {
  await startServer({
    router: dredgeRouter([
      route
        .path("/test")
        .post(z.string())
        .use((req, res) => {
          return res.end({
            status: 200,
            text: req.data,
          });
        })
        .build(),
    ]),

    bodyParsers: {
      "application/json": ({}) => {
        return "application/json";
      },
      "multipart/*": ({}) => {
        return "multipart/*";
      },
      "text/*": ({}) => {
        return "text/*";
      },
      "text/plain": ({}) => {
        return "text/plain";
      },
      "*/*": ({}) => {
        return "*/*";
      },
    },
  });

  const application_json = await client("/test", {
    method: "POST",
    body: "any-body",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const multipart_ = await client("/test", {
    method: "POST",
    body: "any-body",
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const text_plain = await client("/test", {
    method: "POST",
    body: "any-body",
    headers: {
      "Content-Type": "text/plain",
    },
  });

  const text_ = await client("/test", {
    method: "POST",
    body: "any-body",
    headers: {
      "Content-Type": "text/html",
    },
  });

  const any = await client("/test", {
    method: "POST",
    body: "any-body",
    headers: {
      "Content-Type": "image/png",
    },
  });

  expect(await application_json.text()).toBe("application/json");

  expect(await multipart_.text()).toBe("multipart/*");

  expect(await text_plain.text()).toBe("text/plain");

  expect(await text_.text()).toBe("text/*");

  expect(await any.text()).toBe("*/*");
});

test("serializeData", async () => {
  await startServer({
    router: dredgeRouter([
      dredgeRoute()
        .path("/test")
        .post(z.string())
        .use((req, res) => {
          return res.end({
            status: 200,
            headers: {
              "Content-Type": req.data || req.header("accept") || "",
            },
            data: "",
          });
        })
        .build(),
    ]),
    dataSerializers: {
      "application/json": ({}) => {
        return "application/json";
      },
      "multipart/*": ({}) => {
        return "multipart/*";
      },
      "text/*": ({}) => {
        return "text/*";
      },
      "text/plain": ({}) => {
        return "text/plain";
      },
      "*/*": ({}) => {
        return "*/*";
      },
    },
  });

  const application_json = await client("/test", {
    method: "POST",
    body: "application/json",
    headers: {
      "Content-Type": "text/plain",
    },
  });

  const multipart_ = await client("/test", {
    method: "POST",
    body: "multipart/form-data",
    headers: {
      "Content-Type": "text/plain",
    },
  });

  const text_plain = await client("/test", {
    method: "POST",
    body: "text/plain",
    headers: {
      "Content-Type": "text/plain",
    },
  });

  const text_ = await client("/test", {
    method: "POST",
    body: "text/html",
    headers: {
      "Content-Type": "text/plain",
    },
  });

  const any = await client("/test", {
    method: "POST",
    body: "image/png",
    headers: {
      "Content-Type": "text/plain",
    },
  });

  expect(await application_json.text()).toBe("application/json");

  expect(await multipart_.text()).toBe("multipart/*");

  expect(await text_plain.text()).toBe("text/plain");

  expect(await text_.text()).toBe("text/*");

  expect(await any.text()).toBe("*/*");
});

test("prefixUrl", async () => {
  const router = dredgeRouter([
    route
      .path("/test")
      .get()
      .use((req, res) => {
        return res.end({
          status: 200,
          text: req.url,
        });
      })
      .build(),

    route
      .path("/test")
      .post()
      .use((req, res) => {
        return res.end({
          status: 200,
          text: req.url,
        });
      })
      .build(),
  ]);
  const { server } = await startServer({
    router,
    prefixUrl: "/base",
  });

  const get = await client("/base/test", {
    method: "GET",
  });

  const post = await client("/base/test", {
    method: "POST",
  });

  expect(await get.text()).toBe("/base/test");
  expect(await post.text()).toBe("/base/test");

  server.close();

  await startServer({
    router,
    prefixUrl: "/base/",
  });

  const getII = await client("/base/test", {
    method: "GET",
  });

  const postII = await client("/base/test", {
    method: "POST",
  });

  expect(await getII.text()).toBe("/base/test");
  expect(await postII.text()).toBe("/base/test");
});

test("params default deserialization", async () => {
  const { client } = await startServer({
    router: dredgeRouter([
      route
        .path("/test/:number/:string/:boolean")
        .params({
          number: z.number(),
          boolean: z.boolean(),
        })
        .get()
        .use((req, res) => {
          return res.end({
            status: 200,
            json: req.param(),
          });
        })
        .error((err, req, res) => {
          return res.end({
            status: 400,
          });
        })
        .build(),
    ]),
  });

  const response = await client("test/1/test/true", {
    method: "GET",
  });

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    number: 1,
    string: "test",
    boolean: true,
  });
});

test("searchParams default deserialization", async () => {
  const { client } = await startServer({
    router: dredgeRouter([
      route
        .path("/test")
        .searchParams({
          string: z.string(),
          number: z.number(),
          boolean: z.boolean(),
          date: z.date(),
        })
        .get()
        .use((req, res) => {
          return res.end({
            status: 200,
            json: {
              single: {
                ...req.searchParam(),
                date: req.searchParam("date").toISOString().split("T")[0],
              },
              multiple: req.searchParams(),
            },
          });
        })
        .build(),
    ]),
  });

  const response = await client(
    "test?number=1&string=test&boolean=true&number=2&string=test2&boolean=false&date=2023-01-01",
    {
      method: "GET",
    },
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    single: {
      number: 1,
      string: "test",
      boolean: true,
      date: "2023-01-01",
    },
    multiple: {
      number: [1, 2],
      string: ["test", "test2"],
      boolean: [true, false],
    },
  });
});

test("send error response in case of failed validation", async () => {
  await startServer({
    router: dredgeRouter([
      route
        .path("/test")
        .searchParams({
          string: z.string().optional(),
          number: z.number().optional(),
          boolean: z.boolean().optional(),
        })
        .get()
        .use((req, res) => {
          return res.end({
            status: 200,
          });
        })
        .error((err, req, res) => {
          return res.end({
            status: 400,
          });
        })
        .build(),
    ]),
  });

  expect(
    await client("test", {
      method: "GET",
    }),
  ).property("status", 200);

  expect(
    await client("test?number=1&string=test&boolean=true", {
      method: "GET",
    }),
  ).property("status", 200);

  expect(
    await client("test?number=true&string=test&boolean=12", {
      method: "GET",
    }),
  ).property("status", 400);

  expect(
    await client("test?number=true", {
      method: "GET",
    }),
  ).property("status", 400);
});

// test("no content-type matches in bodyParser and dataSerializers", async () => {
//   await startServer({
//     router: dredgeRouter([
//       dredgeRoute()
//         .path("/test")
//         .post(z.string())
//         .use((req, res) => {
//           return res.end({
//             status: 200,
//             data: "text",
//           });
//         })
//         .build(),
//     ]),

//     bodyParsers: {},
//     dataSerializers: {},
//   });

//   const response = await client("/test", {
//     method: "POST",
//     body: "any-body",
//     headers: {
//       "Content-Type": "text/plain",
//     },
//   });

//   expect(await response.text()).toBe("text");
// });

test("update of mediaType and other params after dataSerialization", async () => {});
