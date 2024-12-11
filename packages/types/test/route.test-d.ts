import { describe, expectTypeOf, test } from "vitest";
import { z } from "zod";
import { inferRouteDataTypes } from "../source/route/route-options";
import { Simplify } from "../source/utils";
import { dredgeRoute } from "./helpers/dredge-route";

describe("req", () => {
  describe("route.options()", () => {
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
        .use((_, { req }) => {
          expectTypeOf(req.data).toBeAny();
        });
    });

    test("infers `undefined` when method is get, delete or head", () => {
      dredgeRoute()
        .path("/test")
        .get()
        .use((_, { req }) => {
          expectTypeOf(req.data).toBeUndefined();
        })
        .error((_, { req }) => {
          expectTypeOf(req.data).toBeUndefined();
        });

      dredgeRoute()
        .path("/test")
        .delete()
        .use((_, { req }) => {
          expectTypeOf(req.data).toBeUndefined();
        })
        .error((_, { req }) => {
          expectTypeOf(req.data).toBeUndefined();
        });

      dredgeRoute()
        .path("/test")
        .head()
        .use((_, { req }) => {
          expectTypeOf(req.data).toBeUndefined();
        })
        .error((_, { req }) => {
          expectTypeOf(req.data).toBeUndefined();
        });
    });

    test("infers `any` for error middleware", () => {
      dredgeRoute()
        .path("/test")
        .error((_, { req }) => {
          expectTypeOf(req.data).toBeAny();
        })
        .post()
        .input(z.string())
        .error((_, { req }) => {
          expectTypeOf(req.data).toBeAny();
        });

      dredgeRoute()
        .path("/test")
        .error((_, { req }) => {
          expectTypeOf(req.data).toBeAny();
        })
        .put()
        .input(z.number())
        .error((_, { req }) => {
          expectTypeOf(req.data).toBeAny();
        });

      dredgeRoute()
        .path("/test")
        .error((_, { req }) => {
          expectTypeOf(req.data).toBeAny();
        })
        .patch()
        .input(z.null())
        .error((_, { req }) => {
          expectTypeOf(req.data).toBeAny();
        });
    });

    test("infers `any` when parser is not provided and method is post, put or patch", () => {
      dredgeRoute()
        .path("/test")
        .post()
        .use((_, { req }) => {
          expectTypeOf(req.data).not.toBeUndefined();
          expectTypeOf(req.data).toBeAny();
        });

      dredgeRoute()
        .path("/test")
        .put()
        .use((_, { req }) => {
          expectTypeOf(req.data).not.toBeUndefined();
          expectTypeOf(req.data).toBeAny();
        });

      dredgeRoute()
        .path("/test")
        .patch()
        .use((_, { req }) => {
          expectTypeOf(req.data).not.toBeUndefined();
          expectTypeOf(req.data).toBeAny();
        });
    });

    test("infers the type provided to input", () => {
      dredgeRoute()
        .path("/test")
        .post()
        .input(z.string())
        .use((_, { req }) => {
          expectTypeOf(req.data).not.toBeUndefined();
          expectTypeOf(req.data).toBeString();
        });

      dredgeRoute()
        .path("/test")
        .put()
        .input(z.number())
        .use((_, { req }) => {
          expectTypeOf(req.data).not.toBeUndefined();
          expectTypeOf(req.data).toBeNumber();
        });

      dredgeRoute()
        .path("/test")
        .patch()
        .input(z.null())
        .use((_, { req }) => {
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
      .use((_, { req }) => {
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
      .error((_, { req }) => {
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
      .use((_, { req }) => {
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
      .error((_, { req }) => {
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
      .use((_, { req }) => {
        expectTypeOf(req.header()).toEqualTypeOf<Record<string, string>>();
      })
      .error((_, { req }) => {
        expectTypeOf(req.header()).toEqualTypeOf<Record<string, string>>();
      });
  });

  test("req.header return `string | undefined` when given a string argument", () => {
    dredgeRoute()
      .use((_, { req }) => {
        expectTypeOf(req.header("content-type")).toEqualTypeOf<
          string | undefined
        >();
      })
      .error((_, { req }) => {
        expectTypeOf(req.header("content-type")).toEqualTypeOf<
          string | undefined
        >();
      });
  });

  test("req.url infers `string`", () => {
    dredgeRoute()
      .use((_, { req }) => {
        expectTypeOf(req.url).toBeString();
      })
      .error((_, { req }) => {
        expectTypeOf(req.url).toBeString();
      })
      .get()
      .use((_, { req }) => {
        expectTypeOf(req.url).toBeString();
      })
      .error((_, { req }) => {
        expectTypeOf(req.url).toBeString();
      });
  });

  test("req.method infers `string` when defined before defining method", () => {
    dredgeRoute()
      .use((_, { req }) => {
        expectTypeOf(req.method).not.toEqualTypeOf<"get">();
        expectTypeOf(req.method).toBeString();
      })
      .error((_, { req }) => {
        expectTypeOf(req.method).not.toEqualTypeOf<"get">();
        expectTypeOf(req.method).toBeString();
      })
      .get();
  });

  test("req.method infers based on method definition", () => {
    dredgeRoute()
      .get()
      .use((_, { req }) => {
        expectTypeOf(req.method).toEqualTypeOf<"get">();
      })
      .error((_, { req }) => {
        expectTypeOf(req.method).toEqualTypeOf<"get">();
      });

    dredgeRoute()
      .post()
      .use((_, { req }) => {
        expectTypeOf(req.method).toEqualTypeOf<"post">();
      })
      .error((_, { req }) => {
        expectTypeOf(req.method).toEqualTypeOf<"post">();
      });

    dredgeRoute()
      .put()
      .use((_, { req }) => {
        expectTypeOf(req.method).toEqualTypeOf<"put">();
      })
      .error((_, { req }) => {
        expectTypeOf(req.method).toEqualTypeOf<"put">();
      });

    dredgeRoute()
      .delete()
      .use((_, { req }) => {
        expectTypeOf(req.method).toEqualTypeOf<"delete">();
      })
      .error((_, { req }) => {
        expectTypeOf(req.method).toEqualTypeOf<"delete">();
      });
  });
});

describe("res", () => {
  test("d.data() param extends to `any` when r.output() has not been called", () => {
    dredgeRoute()
      .options({
        dataTypes: {
          json: "application/json",
        },
      })
      .path("/test")
      .use((d) => {
        expectTypeOf<Parameters<typeof d.data>[0]>().toBeAny();
        expectTypeOf<Parameters<typeof d.json>[0]>().toBeAny();
      });
  });

  test("d.data() params extends to whatever passed to r.output()", () => {
    dredgeRoute()
      .options({
        dataTypes: {
          json: "application/json",
        },
      })
      .path("/test")
      .output(z.enum(["a", "b", "c"]))
      .use((d) => {
        type ExpectedDataTypes = "a" | "b" | "c";

        expectTypeOf<
          Parameters<typeof d.data>[0]
        >().toEqualTypeOf<ExpectedDataTypes>();
        expectTypeOf<
          Parameters<typeof d.json>[0]
        >().toEqualTypeOf<ExpectedDataTypes>();
      });
  });

  test("d.data() param extends to whatever passed to d.data() for the first time", () => {
    dredgeRoute()
      .options({
        dataTypes: {
          json: "application/json",
        },
      })
      .path("/test")
      .use((d) => {
        return d.data("a" as "a" | "b" | "c").next();
      })
      .use((d) => {
        type ExpectedDataTypes = "a" | "b" | "c";

        expectTypeOf<
          Parameters<typeof d.data>[0]
        >().toEqualTypeOf<ExpectedDataTypes>();
        expectTypeOf<
          Parameters<typeof d.json>[0]
        >().toEqualTypeOf<ExpectedDataTypes>();
      });
  });

  test("state infers InitialContext in the beginning", () => {
    type InitialContext = { db: "fake-db"; session: { username: string } };

    dredgeRoute<InitialContext>().use((_, { state }) => {
      expectTypeOf(state).toEqualTypeOf<InitialContext>();
    });

    dredgeRoute<InitialContext>().error((_, { state }) => {
      expectTypeOf(state).toEqualTypeOf<InitialContext>();
    });
  });

  test("`d.state({ ... })` mutates state", () => {
    type InitialContext = { db: "fake-db"; session: { username: string } };

    dredgeRoute<InitialContext>()
      .use((d) => {
        return d.state({
          meta: { info: "...." },
          session: {
            userId: 1,
          },
        });
      })
      .use((_, { state }) => {
        expectTypeOf(state).toEqualTypeOf<{
          meta: { info: string };
          session: { userId: number };
          db: "fake-db";
        }>();
      })
      .use(() => {})
      .use((d) => {
        return d.state({
          session: {
            userId: "1",
          },
        });
      })
      .use((_, { state }) => {
        expectTypeOf(state).toEqualTypeOf<{
          meta: { info: string };
          session: { userId: string };
          db: "fake-db";
        }>();
      });

    dredgeRoute<InitialContext>()
      .error((d) => {
        return d.state({
          meta: { info: "...." },
          session: {
            userId: 1,
          },
        });
      })
      .error((_, { state }) => {
        expectTypeOf(state).toEqualTypeOf<{
          meta: { info: string };
          session: { userId: number };
          db: "fake-db";
        }>();
      })
      .error(() => {})
      .error((d) => {
        return d.state({
          session: {
            userId: "1",
          },
        });
      })
      .error((_, { state }) => {
        expectTypeOf(state).toEqualTypeOf<{
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
      .use((_, { res }) => {
        expectTypeOf(res.data).toBeAny();
      })
      .use(() => {})
      .use((d, { res }) => {
        expectTypeOf(res.data).toBeAny();
        return d.data([1, 2, 3]).next();
      })
      .use((_, { res }) => {
        expectTypeOf(res.data).toBeAny();
      })
      .output(z.enum(["a", "b", "c"]))
      .use((_, { res }) => {
        expectTypeOf(res.data).toBeAny();
      });
  });

  test("res.header() returns `Record<string, string>` when given no argument", () => {
    dredgeRoute()
      .use((_, { res }) => {
        expectTypeOf(res.header()).toEqualTypeOf<Record<string, string>>();
      })
      .error((_, { res }) => {
        expectTypeOf(res.header()).toEqualTypeOf<Record<string, string>>();
      });
  });

  test("res.header() returns `string | undefined` when given a string argument", () => {
    dredgeRoute()
      .use((_, { res }) => {
        expectTypeOf(res.header("content-type")).toEqualTypeOf<
          string | undefined
        >();
      })
      .error((_, { res }) => {
        expectTypeOf(res.header("content-type")).toEqualTypeOf<
          string | undefined
        >();
      });
  });

  test("res.status infers `number | undefined`", () => {
    dredgeRoute()
      .path("/test")
      .get()
      .use((_, { res }) => {
        expectTypeOf(res.status).toEqualTypeOf<number | undefined>();
      })
      .error((_, { res }) => {
        expectTypeOf(res.status).toEqualTypeOf<number | undefined>();
      });
  });

  test("res.statusText infers `string | undefined`", () => {
    dredgeRoute()
      .path("/test")
      .get()
      .use((_, { res }) => {
        expectTypeOf(res.statusText).toEqualTypeOf<string | undefined>();
      })
      .error((_, { res }) => {
        expectTypeOf(res.statusText).toEqualTypeOf<string | undefined>();
      });
  });
});
