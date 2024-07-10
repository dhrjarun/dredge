import {
  Simplify,
  inferInitialRouteContext,
  inferModifiedInitialRouteContext,
  inferRouteDataTypes,
} from "@dredge/common";
import { describe, expectTypeOf, test } from "vitest";
import { z } from "zod";
import { dredgeRoute } from "../source/route";

describe("route.options()", () => {
  test("invalid dataType should return string type", () => {
    const route = dredgeRoute().options({
      dataTypes: {
        status: "any/any",
      },
    });

    expectTypeOf(route).toBeString();
  });
  test("merging of dataTypes should work -- previous value should have priority", () => {
    const route = dredgeRoute()
      .options({
        dataTypes: {
          json: "application/json",
          formData: "application/form-data",
        },
        defaultContext: {},
      })
      .options({})
      .options({
        dataTypes: {
          formData: "application/form",
          xml: "application/xml",
        },
      })
      .path("/test")
      .get()
      .build();

    type DataTypes = Simplify<inferRouteDataTypes<typeof route>>;

    expectTypeOf<DataTypes>().toEqualTypeOf<{
      readonly json: "application/json";
      readonly formData: "application/form-data";
      readonly xml: "application/xml";
    }>();
  });

  test("merging of defaultContext should work", () => {
    type Context = { db: "fake-db"; session: { username: string }; meta: any };

    let route = dredgeRoute<Context>()
      .options({
        defaultContext: {
          db: "fake-db",
        },
      })
      .options({})
      .options({
        defaultContext: {
          db: "fake-db",
          meta: {
            info: "......",
          },
        },
      })
      .path("/test")
      .get()
      .build();

    type InitialContext = inferInitialRouteContext<typeof route>;
    type ModifiedContext = Simplify<
      inferModifiedInitialRouteContext<typeof route>
    >;

    expectTypeOf<InitialContext>().toEqualTypeOf<Context>();
    expectTypeOf<ModifiedContext>().toEqualTypeOf<{
      db?: "fake-db";
      meta?: any;
      session: { username: string };
    }>();
  });
});

describe("req", () => {
  test("data should be any, if middleware is defined before defining the method", () => {
    dredgeRoute()
      .path("/test")
      .use((req) => {
        expectTypeOf(req.data).toBeAny();
      });
  });

  test("req.data for get, delete and head should be undefined", () => {
    dredgeRoute()
      .path("/test")
      .get()
      .use((req) => {
        expectTypeOf(req.data).toBeUndefined();
      });

    dredgeRoute()
      .path("/test")
      .delete()
      .use((req) => {
        expectTypeOf(req.data).toBeUndefined();
      });

    dredgeRoute()
      .path("/test")
      .head()
      .use((req) => {
        expectTypeOf(req.data).toBeUndefined();
      });
  });

  test("req.data for post, put and patch should be any, if not parser is given", () => {
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

  test("req.data should have correct type", () => {
    dredgeRoute()
      .path("/test")
      .post(z.string())
      .use((req) => {
        expectTypeOf(req.data).not.toBeUndefined();
        expectTypeOf(req.data).toBeString();
      });

    dredgeRoute()
      .path("/test")
      .put(z.number())
      .use((req) => {
        expectTypeOf(req.data).not.toBeUndefined();
        expectTypeOf(req.data).toBeNumber();
      });

    dredgeRoute()
      .path("/test")
      .patch(z.null())
      .use((req) => {
        expectTypeOf(req.data).not.toBeUndefined();
        expectTypeOf(req.data).toBeNull();
      });
  });

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

        // https://stackoverflow.com/questions/68799234/typescript-pick-only-specific-method-from-overload-to-be-passed-to-parameterst
        // expectTypeOf(req.param)
        //   .parameter(0)
        //   .toEqualTypeOf<"paramI" | "paramII">();

        expectTypeOf(req.param()).toEqualTypeOf<{
          paramI: string;
          readonly paramII: "a" | "b";
          [x: string]: string;
        }>();
      });
  });

  test("req.searchParam() and req.searchParams", () => {
    dredgeRoute()
      .path("/test")
      .searchParams({
        queryI: z.string(),
        queryII: z.enum(["a", "b"]),
      })
      .params({
        paramII: z.enum(["a", "b"]),
      })
      .use((req) => {
        expectTypeOf(req.searchParam("queryI")).toBeString();
        expectTypeOf(req.searchParam("queryII")).toEqualTypeOf<"a" | "b">();
        expectTypeOf(req.searchParam("x")).toBeAny();

        expectTypeOf(req.searchParams("queryI")).toEqualTypeOf<string[]>();
        expectTypeOf(req.searchParams("queryII")).toEqualTypeOf<
          ("a" | "b")[]
        >();
        expectTypeOf(req.searchParams("x")).toEqualTypeOf<any[]>();

        // https://stackoverflow.com/questions/68799234/typescript-pick-only-specific-method-from-overload-to-be-passed-to-parameterst
        // expectTypeOf(req.searchParam)
        //   .parameter(0)
        //   .toEqualTypeOf<"queryI" | "queryII">();

        expectTypeOf(req.searchParam()).toEqualTypeOf<{
          readonly queryI: string;
          readonly queryII: "a" | "b";
          [x: string]: any;
        }>();

        expectTypeOf(req.searchParams()).toEqualTypeOf<{
          readonly queryI: string[];
          readonly queryII: ("a" | "b")[];
          [x: string]: any[];
        }>();
      });
  });

  test("req.header()", () => {
    dredgeRoute().use((req) => {
      expectTypeOf(req.header()).toEqualTypeOf<Record<string, string>>();
      expectTypeOf(req.header("content-type")).toEqualTypeOf<
        string | undefined
      >();
    });
  });

  test("req.method should be string in middlewares which are defined before defining method", () => {
    dredgeRoute()
      .use((req) => {
        expectTypeOf(req.method).not.toEqualTypeOf<"get">();
        expectTypeOf(req.method).toBeString();
      })
      .get();
  });

  test("req.url", () => {
    dredgeRoute()
      .use((req) => {
        expectTypeOf(req.url).toBeString();
      })
      .error((err, req) => {
        expectTypeOf(req.url).toBeString();
      })
      .get()
      .use((req) => {
        expectTypeOf(req.url).toBeString();
      })
      .error((err, req) => {
        expectTypeOf(req.url).toBeString();
      });
  });

  test("req.method", () => {
    dredgeRoute()
      .get()
      .use((req) => {
        expectTypeOf(req.method).toEqualTypeOf<"get">();
      });

    dredgeRoute()
      .post()
      .use((req) => {
        expectTypeOf(req.method).toEqualTypeOf<"post">();
      });

    dredgeRoute()
      .put()
      .use((req) => {
        expectTypeOf(req.method).toEqualTypeOf<"put">();
      });

    dredgeRoute()
      .delete()
      .use((req) => {
        expectTypeOf(req.method).toEqualTypeOf<"delete">();
      });
  });
});

describe("res", () => {
  test("", () => {
    dredgeRoute()
      .options({
        dataTypes: {
          json: "application/json",
          form: "application/form-data",
        },
      })
      .use((req, res) => {
        type NextParameter = Simplify<Parameters<typeof res.next>[0]>;
        type EndParameter = Simplify<Parameters<typeof res.end>[0]>;

        expectTypeOf<NextParameter>().toEqualTypeOf<
          | {
              data?: any;
              ctx?: unknown;
              headers?: Record<string, string> | undefined;
              status?: number | undefined;
              statusText?: string | undefined;
            }
          | {
              json?: any;
              ctx?: unknown;
              headers?: Record<string, string> | undefined;
              status?: number | undefined;
              statusText?: string | undefined;
            }
          | {
              form?: any;
              ctx?: unknown;
              headers?: Record<string, string> | undefined;
              status?: number | undefined;
              statusText?: string | undefined;
            }
        >();

        expectTypeOf<EndParameter>().toEqualTypeOf<
          | {
              data?: any;
              headers?: Record<string, string> | undefined;
              status?: number | undefined;
              statusText?: string | undefined;
            }
          | {
              json?: any;
              headers?: Record<string, string> | undefined;
              status?: number | undefined;
              statusText?: string | undefined;
            }
          | {
              form?: any;
              headers?: Record<string, string> | undefined;
              status?: number | undefined;
              statusText?: string | undefined;
            }
        >();
      });

    dredgeRoute()
      .options({
        dataTypes: {
          json: "application/json",
          form: "application/form-data",
        },
      })
      .output(z.string())
      .use((req, res) => {
        type NextParameter = Simplify<Parameters<typeof res.next>[0]>;
        type EndParameter = Simplify<Parameters<typeof res.end>[0]>;

        expectTypeOf<NextParameter>().toEqualTypeOf<
          | {
              data?: any;
              ctx?: unknown;
              headers?: Record<string, string> | undefined;
              status?: number | undefined;
              statusText?: string | undefined;
            }
          | {
              json?: any;
              ctx?: unknown;
              headers?: Record<string, string> | undefined;
              status?: number | undefined;
              statusText?: string | undefined;
            }
          | {
              form?: any;
              ctx?: unknown;
              headers?: Record<string, string> | undefined;
              status?: number | undefined;
              statusText?: string | undefined;
            }
        >();

        expectTypeOf<EndParameter>().toEqualTypeOf<
          | {
              data?: string;
              headers?: Record<string, string> | undefined;
              status?: number | undefined;
              statusText?: string | undefined;
            }
          | {
              json?: string;
              headers?: Record<string, string> | undefined;
              status?: number | undefined;
              statusText?: string | undefined;
            }
          | {
              form?: string;
              headers?: Record<string, string> | undefined;
              status?: number | undefined;
              statusText?: string | undefined;
            }
        >();
      });
  });
});
