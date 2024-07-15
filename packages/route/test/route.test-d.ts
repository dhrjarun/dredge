import { describe, expectTypeOf, test } from "vitest";
import { z } from "zod";
import { dredgeRoute } from "../source/route";
import {
  inferInitialRouteContext,
  inferModifiedInitialRouteContext,
  inferRouteDataTypes,
  inferRouteEData,
  inferRouteOData,
} from "../source/types";
import { Simplify } from "../source/types/utils";

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
      })
      .error((err, req) => {
        expectTypeOf(req.data).toBeUndefined();
      });

    dredgeRoute()
      .path("/test")
      .delete()
      .use((req) => {
        expectTypeOf(req.data).toBeUndefined();
      })
      .error((err, req) => {
        expectTypeOf(req.data).toBeUndefined();
      });

    dredgeRoute()
      .path("/test")
      .head()
      .use((req) => {
        expectTypeOf(req.data).toBeUndefined();
      })
      .error((err, req) => {
        expectTypeOf(req.data).toBeUndefined();
      });
  });

  test("req.data should always be any in error for method which takes data", () => {
    dredgeRoute()
      .path("/test")
      .error((err, req) => {
        expectTypeOf(req.data).toBeAny();
      })
      .post(z.string())
      .error((err, req) => {
        expectTypeOf(req.data).toBeAny();
      });

    dredgeRoute()
      .path("/test")
      .error((err, req) => {
        expectTypeOf(req.data).toBeAny();
      })
      .put(z.number())
      .error((err, req) => {
        expectTypeOf(req.data).toBeAny();
      });

    dredgeRoute()
      .path("/test")
      .error((err, req) => {
        expectTypeOf(req.data).toBeAny();
      })
      .patch(z.null())
      .error((err, req) => {
        expectTypeOf(req.data).toBeAny();
      });
  });

  test("req.data for post, put and patch should be any, if parser is not given", () => {
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
      })
      .error((err, req) => {
        expectTypeOf(req.param("x")).toEqualTypeOf<string | undefined>();
        expectTypeOf(req.param()).toEqualTypeOf<{
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
      })
      .error((err, req) => {
        expectTypeOf(req.searchParam("x")).toBeAny();
        expectTypeOf(req.searchParams("x")).toEqualTypeOf<any[]>();

        expectTypeOf(req.searchParam()).toEqualTypeOf<{
          [x: string]: any;
        }>();
        expectTypeOf(req.searchParams()).toEqualTypeOf<{
          [x: string]: any[];
        }>();
      });
  });

  test("req.header()", () => {
    dredgeRoute()
      .use((req) => {
        expectTypeOf(req.header()).toEqualTypeOf<Record<string, string>>();
        expectTypeOf(req.header("content-type")).toEqualTypeOf<
          string | undefined
        >();
      })
      .error((err, req, res) => {
        expectTypeOf(req.header()).toEqualTypeOf<Record<string, string>>();
        expectTypeOf(req.header("content-type")).toEqualTypeOf<
          string | undefined
        >();
      });
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

  test("req.method should be string in middlewares which are defined before defining method", () => {
    dredgeRoute()
      .use((req) => {
        expectTypeOf(req.method).not.toEqualTypeOf<"get">();
        expectTypeOf(req.method).toBeString();
      })
      .error((err, req) => {
        expectTypeOf(req.method).not.toEqualTypeOf<"get">();
        expectTypeOf(req.method).toBeString();
      })
      .get();
  });

  test("req.method", () => {
    dredgeRoute()
      .get()
      .use((req) => {
        expectTypeOf(req.method).toEqualTypeOf<"get">();
      })
      .error((err, req) => {
        expectTypeOf(req.method).toEqualTypeOf<"get">();
      });

    dredgeRoute()
      .post()
      .use((req) => {
        expectTypeOf(req.method).toEqualTypeOf<"post">();
      })
      .error((err, req) => {
        expectTypeOf(req.method).toEqualTypeOf<"post">();
      });

    dredgeRoute()
      .put()
      .use((req) => {
        expectTypeOf(req.method).toEqualTypeOf<"put">();
      })
      .error((err, req) => {
        expectTypeOf(req.method).toEqualTypeOf<"put">();
      });

    dredgeRoute()
      .delete()
      .use((req) => {
        expectTypeOf(req.method).toEqualTypeOf<"delete">();
      })
      .error((err, req) => {
        expectTypeOf(req.method).toEqualTypeOf<"delete">();
      });
  });
});

describe("res", () => {
  test("res.header", () => {
    dredgeRoute()
      .use((req, res) => {
        expectTypeOf(res.header()).toEqualTypeOf<Record<string, string>>();
        expectTypeOf(res.header("content-type")).toEqualTypeOf<
          string | undefined
        >();
      })
      .error((err, req, res) => {
        expectTypeOf(res.header()).toEqualTypeOf<Record<string, string>>();
        expectTypeOf(res.header("content-type")).toEqualTypeOf<
          string | undefined
        >();
      });
  });

  test("data in res.next option parameter", () => {
    type ExpectedNextTypes =
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
        };

    type ExpectedEndTypes<T = any> =
      | {
          data?: T;
          headers?: Record<string, string> | undefined;
          status?: number | undefined;
          statusText?: string | undefined;
        }
      | {
          json?: T;
          headers?: Record<string, string> | undefined;
          status?: number | undefined;
          statusText?: string | undefined;
        }
      | {
          form?: T;
          headers?: Record<string, string> | undefined;
          status?: number | undefined;
          statusText?: string | undefined;
        };

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

        expectTypeOf<NextParameter>().toEqualTypeOf<ExpectedNextTypes>();
        expectTypeOf<EndParameter>().toEqualTypeOf<ExpectedEndTypes>();
      })
      .error((err, req, res) => {
        type NextParameter = Simplify<Parameters<typeof res.next>[0]>;
        type EndParameter = Simplify<Parameters<typeof res.end>[0]>;

        expectTypeOf<NextParameter>().toEqualTypeOf<ExpectedNextTypes>();
        expectTypeOf<EndParameter>().toEqualTypeOf<ExpectedEndTypes>();
      })
      .output(z.string())
      .use((req, res) => {
        type NextParameter = Simplify<Parameters<typeof res.next>[0]>;
        type EndParameter = Simplify<Parameters<typeof res.end>[0]>;

        expectTypeOf<NextParameter>().toEqualTypeOf<ExpectedNextTypes>();
        expectTypeOf<EndParameter>().toEqualTypeOf<ExpectedEndTypes<string>>();
      });
  });

  test("res.ctx in use()", () => {
    dredgeRoute<{ db: "fake-db"; session: { username: string } }>()
      .use((req, res) => {
        expectTypeOf(res.ctx).toEqualTypeOf<{
          db: "fake-db";
          session: { username: string };
        }>();

        return res.next({
          ctx: {
            meta: { info: "...." },
            session: {
              userId: 1,
            },
          },
        });
      })
      .use((req, res) => {
        expectTypeOf(res.ctx).toEqualTypeOf<{
          meta: { info: string };
          session: { userId: number };
          db: "fake-db";
        }>();
      })
      .use(() => {})
      .use((req, res) => {
        return res.next({
          ctx: {
            session: {
              userId: "1",
            },
          },
        });
      })
      .use((req, res) => {
        expectTypeOf(res.ctx).toEqualTypeOf<{
          meta: { info: string };
          session: { userId: string };
          db: "fake-db";
        }>();
      });
  });

  test("res.ctx in error()", () => {
    dredgeRoute<{ db: "fake-db"; session: { username: string } }>()
      .error((err, req, res) => {
        expectTypeOf(res.ctx).toEqualTypeOf<{
          db: "fake-db";
          session: { username: string };
        }>();

        return res.next({
          ctx: {
            meta: { info: "...." },
            session: {
              userId: 1,
            },
          },
        });
      })
      .error((err, req, res) => {
        expectTypeOf(res.ctx).toEqualTypeOf<{
          meta: { info: string };
          session: { userId: number };
          db: "fake-db";
        }>();
      })
      .error(() => {})
      .error((err, req, res) => {
        return res.next({
          ctx: {
            session: {
              userId: "1",
            },
          },
        });
      })
      .error((err, req, res) => {
        expectTypeOf(res.ctx).toEqualTypeOf<{
          meta: { info: string };
          session: { userId: string };
          db: "fake-db";
        }>();
      });
  });

  test("OData should be any, if res.end() is returned without data and same with EData", () => {
    const routeI = dredgeRoute()
      .path("/test")
      .get()
      .use((req, res) => {
        return res.end({ status: 200 });
      })
      .error((err, req, res) => {
        return res.end({ status: 200 });
      });

    type ODataI = inferRouteOData<typeof routeI>;
    expectTypeOf<ODataI>().toEqualTypeOf<any>();
    type EDataI = inferRouteEData<typeof routeI>;
    expectTypeOf<EDataI>().toEqualTypeOf<any>();

    const routeII = dredgeRoute()
      .path("/test")
      .get()
      .use((req, res) => {
        return res.end();
      })
      .error((err, req, res) => {
        return res.end();
      });

    type ODataII = inferRouteOData<typeof routeII>;
    expectTypeOf<ODataII>().toEqualTypeOf<any>();
    type EDataII = inferRouteEData<typeof routeII>;
    expectTypeOf<EDataII>().toEqualTypeOf<any>();
  });

  test("OData should stay never, if res.end() is not returned and same with EData", () => {
    const routeO = dredgeRoute().path("/test").get();

    type ODataO = inferRouteOData<typeof routeO>;
    expectTypeOf<ODataO>().toBeNever();
    type EDataO = inferRouteEData<typeof routeO>;
    expectTypeOf<EDataO>().toBeNever();

    const routeI = dredgeRoute()
      .path("/test")
      .get()
      .use((req, res) => {})
      .error((err, req, res) => {});

    type ODataI = inferRouteOData<typeof routeI>;
    expectTypeOf<ODataI>().toBeNever();
    type EDataI = inferRouteEData<typeof routeI>;
    expectTypeOf<EDataI>().toBeNever();

    const routeII = dredgeRoute()
      .path("/test")
      .get()
      .use((req, res) => {
        return res.next({
          ctx: {
            session: 1,
          },
          status: 200,
        });
      })
      .error((err, req, res) => {
        return res.next({
          ctx: {
            session: 1,
          },
          status: 200,
        });
      });

    type ODataII = inferRouteOData<typeof routeII>;
    expectTypeOf<ODataII>().toBeNever();
    type EDataII = inferRouteEData<typeof routeII>;
    expectTypeOf<EDataII>().toBeNever();

    const routeIII = dredgeRoute()
      .path("/test")
      .get()
      .use((req, res) => {
        return res.next({
          data: "...",
        });
      })
      .error((err, req, res) => {
        return res.next({
          data: "...",
        });
      });

    type ODataIII = inferRouteOData<typeof routeIII>;
    expectTypeOf<ODataIII>().toBeNever();
    type EDataIII = inferRouteEData<typeof routeIII>;
    expectTypeOf<EDataIII>().toBeNever();

    const routeIV = dredgeRoute()
      .path("/test")
      .get()
      .use((req, res) => {})
      .use((req, res) => {
        return res.next();
      })
      .error((err, req, res) => {
        return res.next();
      });

    type ODataIV = inferRouteOData<typeof routeIV>;
    expectTypeOf<ODataIV>().toBeNever();
    type EDataIV = inferRouteEData<typeof routeIV>;
    expectTypeOf<EDataIV>().toBeNever();
  });

  test("OData will be `any` after .build() if it was never before and same with EData", () => {
    const routeI = dredgeRoute()
      .path("/test")
      .get()
      .use((req, res) => {
        return res.next();
      })
      .error((err, req, res) => {
        return res.next();
      });

    expectTypeOf<inferRouteOData<typeof routeI>>().toBeNever();
    expectTypeOf<inferRouteEData<typeof routeI>>().toBeNever();

    const routeI_built = routeI.build();
    expectTypeOf<inferRouteOData<typeof routeI_built>>().toBeAny();
    expectTypeOf<inferRouteEData<typeof routeI_built>>().toBeAny();
  });

  test("res.end and responseData", () => {
    const route = dredgeRoute()
      .path("/test")
      .get()
      .use((req, res) => {
        return res.end({
          data: "this is string" as const,
        });
      })
      .build();

    type OData = inferRouteOData<typeof route>;
    expectTypeOf<OData>().toEqualTypeOf<"this is string">();
  });

  test("res.output and responseData", () => {
    const route = dredgeRoute()
      .path("/test")
      .get()
      .output(z.enum(["a", "b", "c"]))
      .use((req, res) => {
        return res.end({
          data: "a",
        });
      })
      .build();

    type OData = inferRouteOData<typeof route>;
    expectTypeOf<OData>().toEqualTypeOf<"a" | "b" | "c">();
  });

  test("res.data should always be `any`", () => {
    dredgeRoute()
      .path("/test")
      .get()
      .use((req, res) => {
        expectTypeOf(res.data).toBeAny();
      })
      .use(() => {})
      .use((req, res) => {
        expectTypeOf(res.data).toBeAny();
        return res.next({
          data: [1, 2, 3],
        });
      })
      .use((req, res) => {
        expectTypeOf(res.data).toBeAny();
      })
      .output(z.enum(["a", "b", "c"]))
      .use((req, res) => {
        expectTypeOf(res.data).toBeAny();
      })
      .build();

    dredgeRoute()
      .path("/test")
      .get()
      .error((err, req, res) => {
        expectTypeOf(res.data).toBeAny();
      })
      .error(() => {})
      .error((err, req, res) => {
        expectTypeOf(res.data).toBeAny();
        return res.next({
          data: [1, 2, 3],
        });
      })
      .error((err, req, res) => {
        expectTypeOf(res.data).toBeAny();
      });
  });

  test("res.status and res.statusText", () => {
    dredgeRoute()
      .path("/test")
      .get()
      .use((req, res) => {
        expectTypeOf(res.status).toEqualTypeOf<number | undefined>();
        expectTypeOf(res.statusText).toEqualTypeOf<string | undefined>();
      })
      .error((err, req, res) => {
        expectTypeOf(res.status).toEqualTypeOf<number | undefined>();
        expectTypeOf(res.statusText).toEqualTypeOf<string | undefined>();
      });
  });
});