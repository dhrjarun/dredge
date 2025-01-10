import { Server } from "http";
import { dredgeRoute, dredgeRouter } from "dredge-route";
import { afterEach, describe, expect, test } from "vitest";
import z from "zod";
import { Client, c } from "./helpers/client";
import { startServer as fStartServer } from "./helpers/fetch-server";
import { startServer as nStartServer } from "./helpers/http-server";

const route = dredgeRoute().options({
  dataTypes: {
    json: "application/json",
    text: "text/plain",
  },
});

const servers = [
  {
    name: "node-http",
    startServer: nStartServer,
  },
  {
    name: "fetch",
    startServer: fStartServer,
  },
];

describe.each(servers)(
  "$name server",
  ({ startServer: ss }: (typeof servers)[number]) => {
    let server: Server;
    let client: Client;

    async function startServer(options: Parameters<typeof ss>[0]) {
      server = await ss(options as any);
      client = c(server.address());
    }

    afterEach(() => {
      server.close();
    });

    test("default JSON bodyParse and dataStringify", async () => {
      await startServer({
        router: dredgeRouter([
          route
            .path("/success")
            .post()
            .use(({ req }, d) => {
              return d.status(200).json({
                ...req.data,
              });
            }),

          route
            .path("/error")
            .post()
            .use(() => {
              throw "error";
            })
            .error(({ req }, d) => {
              return d.status(500).json({
                ...req.data,
              });
            }),
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

    test("default text bodyParse and dataStringify", async () => {
      await startServer({
        router: dredgeRouter([
          route
            .path("/success")
            .post()
            .input(z.string())
            .use(({ req }, d) => {
              return d.status(200).text(req.data);
            }),

          route
            .path("/error")
            .post()
            .input(z.string())
            .use(() => {
              throw "error";
            })
            .error(({ req }, d) => {
              return d.status(500).text(req.data);
            }),
        ]),
      });

      const data = "test";

      const successResponse = await client("success", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: data,
      });

      const errorResponse = await client("error", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
        body: data,
      });

      expect(successResponse.status).toBe(200);
      expect(await successResponse.text()).toBe(data);

      expect(errorResponse.status).toBe(500);
      expect(await errorResponse.text()).toBe(data);
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
            .use((_, d) => {
              return d.json(data);
            }),
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
      await startServer({
        router: dredgeRouter([
          dredgeRoute()
            .path("/test-I")
            .get()
            .use((_, d) => {
              d.status(200);
            }),
        ]),
      });

      const responseI = await client("test-I", {
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
            .params({
              a: z.string(),
              b: z.string(),
            })
            .get()
            .error((_, d) => {
              d.status(500);
            })
            .use(({ req }, d) => {
              d.status(200).json(req.param());
            }),
        ]),

        deserializeParams: (params) => {
          const newParams: Record<string, any | any> = {};

          Object.entries(params).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              newParams[key] = value.map((v) => `ds-${v}`);
            } else {
              newParams[key] = `ds-${value}`;
            }
          });

          return newParams;
        },
      });

      expect(
        await (
          await client("/test/p?a=apple&b=ball", {
            method: "GET",
          })
        ).json(),
      ).toStrictEqual({
        param: "ds-p",
        a: "ds-apple",
        b: "ds-ball",
      });

      expect(
        await (
          await client("/test/pp?a=airplane&b=banana", {
            method: "GET",
          })
        ).json(),
      ).toStrictEqual({
        param: "ds-pp",
        a: "ds-airplane",
        b: "ds-banana",
      });
    });

    async function assertBodyText(
      received: Promise<any> | any,
      expected: string,
    ) {
      const text = await (await received).text();
      expect(text).toBe(expected);
    }

    describe("bodyParsers", () => {
      async function ss() {
        await startServer({
          router: dredgeRouter([
            route
              .path("/test")
              .input(z.any())
              .post()
              .use(({ req }, d) => {
                d.status(200).text(req.data);
              }),
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
      }

      async function sendDullPostRequestAs(contentType: string) {
        return await client("/test", {
          method: "POST",
          body: "any-body",
          headers: {
            "Content-Type": contentType,
          },
        });
      }

      test("parsed by `application/json`", async () => {
        await ss();
        await assertBodyText(
          sendDullPostRequestAs("application/json"),
          "application/json",
        );
      });
      test("parsed by `multipart/*`", async () => {
        await ss();
        await assertBodyText(
          sendDullPostRequestAs(
            "multipart/form-data;boundary=--DredgeBoundary73638302",
          ),
          "multipart/*",
        );
      });
      test("parsed by `text/*`", async () => {
        await ss();
        await assertBodyText(sendDullPostRequestAs("text/html"), "text/*");
      });
      test("parsed by `text/plain`", async () => {
        await ss();
        await assertBodyText(
          sendDullPostRequestAs("text/plain;charset=utf-8"),
          "text/plain",
        );
      });
      test("parsed by `*/*`", async () => {
        await ss();
        await assertBodyText(sendDullPostRequestAs("image/png"), "*/*");
      });

      test("argument.contentType equals content-type header in request", async () => {
        function parser(options: any) {
          return options.contentType || "";
        }
        await startServer({
          router: dredgeRouter([
            route
              .path("/test")
              .input(z.any())
              .post()
              .use(({ req }, d) => {
                d.status(200).text(req.data);
              }),
          ]),
          bodyParsers: {
            "application/json": parser,
            "multipart/*": parser,
            "text/plain": parser,
            "*/*": parser,
          },
        });

        await assertBodyText(
          sendDullPostRequestAs("application/json"),
          "application/json",
        );

        await assertBodyText(
          sendDullPostRequestAs(
            "multipart/form-data;boundary=--DredgeBoundary73638302",
          ),
          "multipart/form-data;boundary=--DredgeBoundary73638302",
        );

        await assertBodyText(
          sendDullPostRequestAs("text/plain;charset=utf-8"),
          "text/plain;charset=utf-8",
        );
        await assertBodyText(sendDullPostRequestAs("image/png"), "image/png");
      });
    });

    describe("dataSerializers", () => {
      async function ss() {
        await startServer({
          router: dredgeRouter([
            dredgeRoute()
              .path("/test")
              .post()
              .input(z.string())
              .use(({ req }, d) => {
                d.status(200)
                  .header(
                    "Content-Type",
                    req.data || req.header("accept") || "",
                  )
                  .data("");
              }),
          ]),
          dataSerializers: {
            "application/json": () => {
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
      }

      async function receiveResponseAs(contentType: string) {
        return await client("/test", {
          method: "POST",
          body: contentType,
          headers: {
            "Content-Type": "text/plain",
          },
        });
      }

      test("serialized by `application/json`", async () => {
        await ss();
        await assertBodyText(
          receiveResponseAs("application/json"),
          "application/json",
        );
      });

      test("serialized by `multipart/*`", async () => {
        await ss();
        await assertBodyText(
          receiveResponseAs(
            "multipart/form-data;boundary=--DredgeBoundary73638302",
          ),
          "multipart/*",
        );
      });

      test("serialized by `text/*`", async () => {
        await ss();
        await assertBodyText(receiveResponseAs("text/html"), "text/*");
      });

      test("serialized by `text/plain`", async () => {
        await ss();
        await assertBodyText(
          receiveResponseAs("text/plain;charset=utf-8"),
          "text/plain",
        );
      });

      test("serialized by `*/*`", async () => {
        await ss();
        await assertBodyText(
          receiveResponseAs("application/x-www-form-urlencoded"),
          "*/*",
        );
      });

      test("argument.contentType equals accept header in response", async () => {
        function serializer(options: any) {
          return options.contentType || "";
        }
        await startServer({
          router: dredgeRouter([
            dredgeRoute()
              .path("/test")
              .post()
              .input(z.string())
              .use(({ req }, d) => {
                d.status(200)
                  .header(
                    "Content-Type",
                    req.data || req.header("accept") || "",
                  )
                  .data("");
              }),
          ]),
          dataSerializers: {
            "application/json": serializer,
            "multipart/*": serializer,
            "text/plain": serializer,
            "*/*": serializer,
          },
        });

        await assertBodyText(
          receiveResponseAs("application/json"),
          "application/json",
        );

        await assertBodyText(
          receiveResponseAs(
            "multipart/form-data;boundary=--DredgeBoundary73638302",
          ),
          "multipart/form-data;boundary=--DredgeBoundary73638302",
        );

        await assertBodyText(
          receiveResponseAs("text/plain;charset=utf-8"),
          "text/plain;charset=utf-8",
        );

        await assertBodyText(receiveResponseAs("image/png"), "image/png");
      });
    });

    test("prefixUrl", async () => {
      const router = dredgeRouter([
        route
          .path("/test")
          .get()
          .use(({ req }, d) => {
            const url = new URL(req.url, "relative:///");
            return d.status(200).text(url.pathname);
          }),
        route
          .path("/test")
          .post()
          .use(({ req }, d) => {
            const url = new URL(req.url, "relative:///");
            return d.status(200).text(url.pathname);
          }),
      ]);
      await startServer({
        router,
        prefixUrl: "/base",
      });

      let get = await client("/base/test", {
        method: "GET",
      });

      let post = await client("/base/test", {
        method: "POST",
      });

      expect(await get.text()).toBe("/base/test");
      expect(await post.text()).toBe("/base/test");

      server.close();

      await startServer({
        router,
        prefixUrl: "/base/",
      });

      get = await client("/base/test", {
        method: "GET",
      });

      post = await client("/base/test", {
        method: "POST",
      });

      expect(await get.text()).toBe("/base/test");
      expect(await post.text()).toBe("/base/test");
    });

    test("params default deserialization", async () => {
      await startServer({
        router: dredgeRouter([
          route
            .path("/test/:number/:string/:boolean")
            .params({
              number: z.number(),
              boolean: z.boolean(),
            })
            .get()
            .use(({ req }, d) => {
              d.status(200).json(req.param());
            }),
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
      await startServer({
        router: dredgeRouter([
          route
            .path("/test")
            .params({
              string: z.string(),
              number: z.number(),
              boolean: z.boolean(),
              date: z.date(),
            })
            .get()
            .use(({ req }, d) => {
              d.status(200).json({
                single: {
                  ...req.param(),
                  date: req.param("date").toISOString().split("T")[0],
                },
                multiple: {
                  number: req.params("number"),
                  string: req.params("string"),
                  boolean: req.params("boolean"),
                },
              });
            }),
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
            .params({
              string: z.string().optional(),
              number: z.number().optional(),
              boolean: z.boolean().optional(),
            })
            .get()
            .use((_, d) => {
              d.status(200);
            })
            .error((_, d) => {
              d.status(400);
            }),
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

    test("if no content-type matches in bodyParser and dataSerializers, there will be no body", async () => {
      await startServer({
        router: dredgeRouter([
          dredgeRoute()
            .path("/test")
            .post()
            .input(z.any())
            .use(({ req }, d) => {
              d.header({
                "x-had-req-data": req.data ? "true" : "false",
              })
                .status(200)
                .data("test");
            })
            .error((_, d) => {
              d.status(500);
            }),
        ]),

        bodyParsers: {},
        dataSerializers: {},
      });

      const response = await client("/test", {
        method: "POST",
        body: "any-body",
        headers: {
          "Content-Type": "some/type",
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("x-had-req-data")).toBe("false");
      expect(await response.text()).toBe("");
    });

    test.todo("update of mediType and other params after dataSerialization");
  },
);
