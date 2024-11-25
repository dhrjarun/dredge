import { describe, expectTypeOf, test } from "vitest";
import { z } from "zod";
import { inferRouteDataTypes } from "../source/route/route-options";
import { Simplify } from "../source/utils";
import { dredgeRoute } from "./helpers/dredge-route";

describe("req", () => {
  describe("route.options()", () => {
    test("returns  error string when invalid dataType is passed", () => {
      const route = dredgeRoute().options({
        dataTypes: {
          status: "any/any",
        },
      });

      expectTypeOf(route).toBeString();
    });
    test("merges types when passed more than once", () => {
      const route = dredgeRoute()
        .options({
          dataTypes: {
            json: "application/json",
            formData: "application/form-data",
          },
        })
        .options({})
        .options({
          dataTypes: {
            formData: "application/form",
            xml: "application/xml",
          },
        })
        .path("/test")
        .get();

      type DataTypes = Simplify<inferRouteDataTypes<typeof route>>;

      expectTypeOf<DataTypes>().toEqualTypeOf<{
        readonly json: "application/json";
        readonly formData: "application/form-data";
        readonly xml: "application/xml";
      }>();
    });
  });

  describe("req.data", () => {
    test("infers `any` when middleware is defined before defining method", () => {
      dredgeRoute()
        .path("/test")
        .use((req) => {
          expectTypeOf(req.data).toBeAny();
        });
    });

    test("infers `undefined` when method is get, delete or head", () => {
      dredgeRoute()
        .path("/test")
        .get()
        .use((req) => {
          expectTypeOf(req.data).toBeUndefined();
        })
        .error((_err, req) => {
          expectTypeOf(req.data).toBeUndefined();
        });

      dredgeRoute()
        .path("/test")
        .delete()
        .use((req) => {
          expectTypeOf(req.data).toBeUndefined();
        })
        .error((_err, req) => {
          expectTypeOf(req.data).toBeUndefined();
        });

      dredgeRoute()
        .path("/test")
        .head()
        .use((req) => {
          expectTypeOf(req.data).toBeUndefined();
        })
        .error((_err, req) => {
          expectTypeOf(req.data).toBeUndefined();
        });
    });

    test("infers `any` for error middleware", () => {
      dredgeRoute()
        .path("/test")
        .error((_err, req) => {
          expectTypeOf(req.data).toBeAny();
        })
        .post()
        .input(z.string())
        .error((_err, req) => {
          expectTypeOf(req.data).toBeAny();
        });

      dredgeRoute()
        .path("/test")
        .error((_err, req) => {
          expectTypeOf(req.data).toBeAny();
        })
        .put()
        .input(z.number())
        .error((_err, req) => {
          expectTypeOf(req.data).toBeAny();
        });

      dredgeRoute()
        .path("/test")
        .error((_err, req) => {
          expectTypeOf(req.data).toBeAny();
        })
        .patch()
        .input(z.null())
        .error((_err, req) => {
          expectTypeOf(req.data).toBeAny();
        });
    });

    test("infers `any` when parser is not provided and method is post, put or patch", () => {
      dredgeRoute()
        .path("/test")
        .post()
        .use((req) => {
          expectTypeOf(req.data).not.toBeUndefined();
          expectTypeOf(req.data).toBeAny();
        });

      dredgeRoute()
        .path("/test")
        .put()
        .use((req) => {
          expectTypeOf(req.data).not.toBeUndefined();
          expectTypeOf(req.data).toBeAny();
        });

      dredgeRoute()
        .path("/test")
        .patch()
        .use((req) => {
          expectTypeOf(req.data).not.toBeUndefined();
          expectTypeOf(req.data).toBeAny();
        });
    });

    test("infers the type provided to input", () => {
      dredgeRoute()
        .path("/test")
        .post()
        .input(z.string())
        .use((req) => {
          expectTypeOf(req.data).not.toBeUndefined();
          expectTypeOf(req.data).toBeString();
        });

      dredgeRoute()
        .path("/test")
        .put()
        .input(z.number())
        .use((req) => {
          expectTypeOf(req.data).not.toBeUndefined();
          expectTypeOf(req.data).toBeNumber();
        });

      dredgeRoute()
        .path("/test")
        .patch()
        .input(z.null())
        .use((req) => {
          expectTypeOf(req.data).not.toBeUndefined();
          expectTypeOf(req.data).toBeNull();
        });
    });
  });

  describe("req.params()", () => {});

  test("req.param()", () => {
    dredgeRoute()
      .path("/test/:paramI/a/:paramII")
      .params({
        paramII: z.enum(["a", "b"]),
      })
      .use((req) => {
        expectTypeOf(req.param("paramI")).toBeString();
        expectTypeOf(req.param("paramII")).toEqualTypeOf<"a" | "b">();
        expectTypeOf(req.param("x")).toEqualTypeOf<string | undefined>();

        /** DO NOT TRY THIS: https://stackoverflow.com/questions/68799234/typescript-pick-only-specific-method-from-overload-to-be-passed-to-parameterst
         expectTypeOf(req.param)
           .parameter(0)
           .toEqualTypeOf<"paramI" | "paramII">();
        */

        expectTypeOf(req.param()).toEqualTypeOf<{
          paramI: string;
          readonly paramII: "a" | "b";
          [x: string]: string;
        }>();
      })
      .error((_err, req) => {
        expectTypeOf(req.param("x")).toEqualTypeOf<string | undefined>();
        expectTypeOf(req.param()).toEqualTypeOf<{
          [x: string]: string;
        }>();
      });
  });

  test("req.query() and req.queries", () => {
    dredgeRoute()
      .path("/test")
      .queries({
        queryI: z.string(),
        queryII: z.enum(["a", "b"]),
      })
      .params({
        paramII: z.enum(["a", "b"]),
      })
      .use((req) => {
        expectTypeOf(req.query("queryI")).toBeString();
        expectTypeOf(req.query("queryII")).toEqualTypeOf<"a" | "b">();
        expectTypeOf(req.query("x")).toBeAny();

        expectTypeOf(req.queries("queryI")).toEqualTypeOf<string[]>();
        expectTypeOf(req.queries("queryII")).toEqualTypeOf<("a" | "b")[]>();
        expectTypeOf(req.queries("x")).toEqualTypeOf<any[]>();

        // https://stackoverflow.com/questions/68799234/typescript-pick-only-specific-method-from-overload-to-be-passed-to-parameterst
        // expectTypeOf(req.searchParam)
        //   .parameter(0)
        //   .toEqualTypeOf<"queryI" | "queryII">();

        expectTypeOf(req.query()).toEqualTypeOf<{
          readonly queryI: string;
          readonly queryII: "a" | "b";
          [x: string]: any;
        }>();

        expectTypeOf(req.queries()).toEqualTypeOf<{
          readonly queryI: string[];
          readonly queryII: ("a" | "b")[];
          [x: string]: any[];
        }>();
      })
      .error((_err, req) => {
        expectTypeOf(req.query("x")).toBeAny();
        expectTypeOf(req.queries("x")).toEqualTypeOf<any[]>();

        expectTypeOf(req.query()).toEqualTypeOf<{
          [x: string]: any;
        }>();
        expectTypeOf(req.queries()).toEqualTypeOf<{
          [x: string]: any[];
        }>();
      });
  });

  test("req.header return `Record<string, string>` when given no argument", () => {
    dredgeRoute()
      .use((req) => {
        expectTypeOf(req.header()).toEqualTypeOf<Record<string, string>>();
      })
      .error((_err, req) => {
        expectTypeOf(req.header()).toEqualTypeOf<Record<string, string>>();
      });
  });

  test("req.header return `string | undefined` when given a string argument", () => {
    dredgeRoute()
      .use((req) => {
        expectTypeOf(req.header("content-type")).toEqualTypeOf<
          string | undefined
        >();
      })
      .error((_err, req) => {
        expectTypeOf(req.header("content-type")).toEqualTypeOf<
          string | undefined
        >();
      });
  });

  test("req.url infers `string`", () => {
    dredgeRoute()
      .use((req) => {
        expectTypeOf(req.url).toBeString();
      })
      .error((_err, req) => {
        expectTypeOf(req.url).toBeString();
      })
      .get()
      .use((req) => {
        expectTypeOf(req.url).toBeString();
      })
      .error((_err, req) => {
        expectTypeOf(req.url).toBeString();
      });
  });

  test("req.method infers `string` when defined before defining method", () => {
    dredgeRoute()
      .use((req) => {
        expectTypeOf(req.method).not.toEqualTypeOf<"get">();
        expectTypeOf(req.method).toBeString();
      })
      .error((_err, req) => {
        expectTypeOf(req.method).not.toEqualTypeOf<"get">();
        expectTypeOf(req.method).toBeString();
      })
      .get();
  });

  test("req.method infers based on method definition", () => {
    dredgeRoute()
      .get()
      .use((req) => {
        expectTypeOf(req.method).toEqualTypeOf<"get">();
      })
      .error((_err, req) => {
        expectTypeOf(req.method).toEqualTypeOf<"get">();
      });

    dredgeRoute()
      .post()
      .use((req) => {
        expectTypeOf(req.method).toEqualTypeOf<"post">();
      })
      .error((_err, req) => {
        expectTypeOf(req.method).toEqualTypeOf<"post">();
      });

    dredgeRoute()
      .put()
      .use((req) => {
        expectTypeOf(req.method).toEqualTypeOf<"put">();
      })
      .error((_err, req) => {
        expectTypeOf(req.method).toEqualTypeOf<"put">();
      });

    dredgeRoute()
      .delete()
      .use((req) => {
        expectTypeOf(req.method).toEqualTypeOf<"delete">();
      })
      .error((_err, req) => {
        expectTypeOf(req.method).toEqualTypeOf<"delete">();
      });
  });
});

describe("res", () => {
  test("data field in res.up() extends to `any` when r.output() has not been called", () => {
    dredgeRoute()
      .options({
        dataTypes: {
          json: "application/json",
        },
      })
      .path("/test")
      .use((_req, res) => {
        type UpParameter = Simplify<Parameters<typeof res.up>[0]>;

        expectTypeOf<UpParameter["data"]>().toBeAny();
        expectTypeOf<UpParameter["json"]>().toBeAny();
      })
      .error((_err, _req, res) => {
        type UpParameter = Simplify<Parameters<typeof res.up>[0]>;
        expectTypeOf<UpParameter["data"]>().toBeAny();
        expectTypeOf<UpParameter["json"]>().toBeAny();
      });
  });

  test("data field in res.up() extends to whatever passed to r.output()", () => {
    dredgeRoute()
      .options({
        dataTypes: {
          json: "application/json",
        },
      })
      .path("/test")
      .output(z.enum(["a", "b", "c"]))
      .use((_req, res) => {
        type UpParameter = Simplify<Parameters<typeof res.up>[0]>;
        type ExpectedDataTypes = "a" | "b" | "c" | undefined;

        expectTypeOf<UpParameter["data"]>().toEqualTypeOf<ExpectedDataTypes>();
        expectTypeOf<UpParameter["json"]>().toEqualTypeOf<ExpectedDataTypes>();
      });
  });

  test("data field in res.up() extends to whatever passed to res.up() for the first time", () => {
    dredgeRoute()
      .options({
        dataTypes: {
          json: "application/json",
        },
      })
      .path("/test")
      .use((_req, res) => {
        let data = "a" as "a" | "b" | "c";
        return res.up({
          data,
        });
      })
      .use((_req, res) => {
        type UpParameter = Simplify<Parameters<typeof res.up>[0]>;
        type ExpectedDataTypes = "a" | "b" | "c" | undefined;

        expectTypeOf<UpParameter["data"]>().toEqualTypeOf<ExpectedDataTypes>();
        expectTypeOf<UpParameter["json"]>().toEqualTypeOf<ExpectedDataTypes>();
      });
  });

  test("res.ctx infers InitialContext in the beginning", () => {
    type InitialContext = { db: "fake-db"; session: { username: string } };

    dredgeRoute<InitialContext>()
      .use((_req, res) => {
        expectTypeOf(res.ctx).toEqualTypeOf<InitialContext>();
      })
      .error((_err, _req, res) => {
        expectTypeOf(res.ctx).toEqualTypeOf<InitialContext>();
      });
  });

  test("`res.up({ctx: ... })` mutates res.ctx", () => {
    type InitialContext = { db: "fake-db"; session: { username: string } };

    dredgeRoute<InitialContext>()
      .use((_req, res) => {
        return res.up({
          ctx: {
            meta: { info: "...." },
            session: {
              userId: 1,
            },
          },
        });
      })
      .use((_req, res) => {
        expectTypeOf(res.ctx).toEqualTypeOf<{
          meta: { info: string };
          session: { userId: number };
          db: "fake-db";
        }>();
      })
      .use(() => {})
      .use((_req, res) => {
        return res.up({
          ctx: {
            session: {
              userId: "1",
            },
          },
        });
      })
      .use((_req, res) => {
        expectTypeOf(res.ctx).toEqualTypeOf<{
          meta: { info: string };
          session: { userId: string };
          db: "fake-db";
        }>();
      });

    dredgeRoute<InitialContext>()
      .error((_err, _req, res) => {
        return res.up({
          ctx: {
            meta: { info: "...." },
            session: {
              userId: 1,
            },
          },
        });
      })
      .error((_err, _req, res) => {
        expectTypeOf(res.ctx).toEqualTypeOf<{
          meta: { info: string };
          session: { userId: number };
          db: "fake-db";
        }>();
      })
      .error(() => {})
      .error((_err, _req, res) => {
        return res.up({
          ctx: {
            session: {
              userId: "1",
            },
          },
        });
      })
      .error((_err, _req, res) => {
        expectTypeOf(res.ctx).toEqualTypeOf<{
          meta: { info: string };
          session: { userId: string };
          db: "fake-db";
        }>();
      });
  });

  test("res.data infers `any`", () => {
    dredgeRoute()
      .path("/test")
      .get()
      .use((_req, res) => {
        expectTypeOf(res.data).toBeAny();
      })
      .use(() => {})
      .use((_req, res) => {
        expectTypeOf(res.data).toBeAny();
        return res.up({
          data: [1, 2, 3],
        });
      })
      .use((_req, res) => {
        expectTypeOf(res.data).toBeAny();
      })
      .output(z.enum(["a", "b", "c"]))
      .use((_req, res) => {
        expectTypeOf(res.data).toBeAny();
      });

    dredgeRoute()
      .path("/test")
      .get()
      .error((_err, _req, res) => {
        expectTypeOf(res.data).toBeAny();
      })
      .error(() => {})
      .error((_err, _req, res) => {
        expectTypeOf(res.data).toBeAny();
        return res.up({
          data: [1, 2, 3],
        });
      })
      .error((_err, _req, res) => {
        expectTypeOf(res.data).toBeAny();
      });
  });

  test("res.header() returns `Record<string, string>` when given no argument", () => {
    dredgeRoute()
      .use((_req, res) => {
        expectTypeOf(res.header()).toEqualTypeOf<Record<string, string>>();
      })
      .error((_err, _req, res) => {
        expectTypeOf(res.header()).toEqualTypeOf<Record<string, string>>();
      });
  });

  test("res.header() returns `string | undefined` when given a string argument", () => {
    dredgeRoute()
      .use((_req, res) => {
        expectTypeOf(res.header("content-type")).toEqualTypeOf<
          string | undefined
        >();
      })
      .error((_err, _req, res) => {
        expectTypeOf(res.header("content-type")).toEqualTypeOf<
          string | undefined
        >();
      });
  });

  test("res.status infers `number | undefined`", () => {
    dredgeRoute()
      .path("/test")
      .get()
      .use((_req, res) => {
        expectTypeOf(res.status).toEqualTypeOf<number | undefined>();
      })
      .error((_err, _req, res) => {
        expectTypeOf(res.status).toEqualTypeOf<number | undefined>();
      });
  });

  test("res.statusText infers `string | undefined`", () => {
    dredgeRoute()
      .path("/test")
      .get()
      .use((_req, res) => {
        expectTypeOf(res.statusText).toEqualTypeOf<string | undefined>();
      })
      .error((_err, _req, res) => {
        expectTypeOf(res.statusText).toEqualTypeOf<string | undefined>();
      });
  });
});
