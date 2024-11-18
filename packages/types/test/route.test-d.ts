import { inferRouteEData, inferRouteOData } from "../source/route/route-data";
import { inferRouteDataTypes } from "../source/route/route-options";
import { Simplify } from "../source/utils";
import { describe, expectTypeOf, test } from "vitest";
import { z } from "zod";
import { dredgeRoute } from "./helpers/dredge-route";

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

  test("req.data should always be any in error for method which takes data", () => {
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

  test("req.header()", () => {
    dredgeRoute()
      .use((req) => {
        expectTypeOf(req.header()).toEqualTypeOf<Record<string, string>>();
        expectTypeOf(req.header("content-type")).toEqualTypeOf<
          string | undefined
        >();
      })
      .error((_err, req, _res) => {
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

  test("req.method should be string in middlewares which are defined before defining method", () => {
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

  test("req.method", () => {
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
  test("res.header", () => {
    dredgeRoute()
      .use((_req, res) => {
        expectTypeOf(res.header()).toEqualTypeOf<Record<string, string>>();
        expectTypeOf(res.header("content-type")).toEqualTypeOf<
          string | undefined
        >();
      })
      .error((_err, _req, res) => {
        expectTypeOf(res.header()).toEqualTypeOf<Record<string, string>>();
        expectTypeOf(res.header("content-type")).toEqualTypeOf<
          string | undefined
        >();
      });
  });

  test("data in res.next option parameter", () => {
    type ExpectedHeaders = Record<string, string | null> | undefined;
    type ExpectedDataTypes = "json" | "form" | undefined;

    type ExpectedNextTypes =
      | {
          data?: any;
          ctx?: unknown;
          headers?: ExpectedHeaders;
          status?: number | undefined;
          statusText?: string | undefined;
          dataType?: ExpectedDataTypes;
        }
      | {
          json?: any;
          ctx?: unknown;
          headers?: ExpectedHeaders;
          status?: number | undefined;
          statusText?: string | undefined;
          dataType?: ExpectedDataTypes;
        }
      | {
          form?: any;
          ctx?: unknown;
          headers?: ExpectedHeaders;
          status?: number | undefined;
          statusText?: string | undefined;
          dataType?: ExpectedDataTypes;
        };

    type ExpectedEndTypes<T = any> =
      | {
          data?: T;
          headers?: ExpectedHeaders;
          status?: number | undefined;
          statusText?: string | undefined;
          dataType?: ExpectedDataTypes;
        }
      | {
          json?: T;
          headers?: ExpectedHeaders;
          status?: number | undefined;
          statusText?: string | undefined;
          dataType?: ExpectedDataTypes;
        }
      | {
          form?: T;
          headers?: ExpectedHeaders;
          status?: number | undefined;
          statusText?: string | undefined;
          dataType?: ExpectedDataTypes;
        };

    dredgeRoute()
      .options({
        dataTypes: {
          json: "application/json",
          form: "application/form-data",
        },
      })
      .use((_req, res) => {
        type NextParameter = Simplify<Parameters<typeof res.next>[0]>;
        type EndParameter = Simplify<Parameters<typeof res.end>[0]>;

        expectTypeOf<NextParameter>().toEqualTypeOf<ExpectedNextTypes>();
        expectTypeOf<EndParameter>().toEqualTypeOf<ExpectedEndTypes>();
      })
      .error((_err, _req, res) => {
        type NextParameter = Simplify<Parameters<typeof res.next>[0]>;
        type EndParameter = Simplify<Parameters<typeof res.end>[0]>;

        expectTypeOf<NextParameter>().toEqualTypeOf<ExpectedNextTypes>();
        expectTypeOf<EndParameter>().toEqualTypeOf<ExpectedEndTypes>();
      })
      .output(z.string())
      .use((_req, res) => {
        type NextParameter = Simplify<Parameters<typeof res.next>[0]>;
        type EndParameter = Simplify<Parameters<typeof res.end>[0]>;

        expectTypeOf<NextParameter>().toEqualTypeOf<ExpectedNextTypes>();
        expectTypeOf<EndParameter>().toEqualTypeOf<ExpectedEndTypes<string>>();
      });
  });

  test("res.ctx in use()", () => {
    dredgeRoute<{ db: "fake-db"; session: { username: string } }>()
      .use((_req, res) => {
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
      .use((_req, res) => {
        expectTypeOf(res.ctx).toEqualTypeOf<{
          meta: { info: string };
          session: { userId: number };
          db: "fake-db";
        }>();
      })
      .use(() => {})
      .use((_req, res) => {
        return res.next({
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
  });

  test("res.ctx in error()", () => {
    dredgeRoute<{ db: "fake-db"; session: { username: string } }>()
      .error((_err, _req, res) => {
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
      .error((_err, _req, res) => {
        expectTypeOf(res.ctx).toEqualTypeOf<{
          meta: { info: string };
          session: { userId: number };
          db: "fake-db";
        }>();
      })
      .error(() => {})
      .error((_err, _req, res) => {
        return res.next({
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

  test("OData should be any, if res.end() is returned without data and same with EData", () => {
    const routeI = dredgeRoute()
      .path("/test")
      .get()
      .use((_req, res) => {
        return res.end({ status: 200 });
      })
      .error((_err, _req, res) => {
        return res.end({ status: 200 });
      });

    type ODataI = inferRouteOData<typeof routeI>;
    expectTypeOf<ODataI>().toEqualTypeOf<any>();
    type EDataI = inferRouteEData<typeof routeI>;
    expectTypeOf<EDataI>().toEqualTypeOf<any>();

    const routeII = dredgeRoute()
      .path("/test")
      .get()
      .use((_req, res) => {
        return res.end();
      })
      .error((_err, _req, res) => {
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
      .use((_req, _res) => {})
      .error((_err, _req, _res) => {});

    type ODataI = inferRouteOData<typeof routeI>;
    expectTypeOf<ODataI>().toBeNever();
    type EDataI = inferRouteEData<typeof routeI>;
    expectTypeOf<EDataI>().toBeNever();

    const routeII = dredgeRoute()
      .path("/test")
      .get()
      .use((_req, res) => {
        return res.next({
          ctx: {
            session: 1,
          },
          status: 200,
        });
      })
      .error((_err, _req, res) => {
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
      .use((_req, res) => {
        return res.next({
          data: "...",
        });
      })
      .error((_err, _req, res) => {
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
      .use((_req, _res) => {})
      .use((_req, res) => {
        return res.next();
      })
      .error((_err, _req, res) => {
        return res.next();
      });

    type ODataIV = inferRouteOData<typeof routeIV>;
    expectTypeOf<ODataIV>().toBeNever();
    type EDataIV = inferRouteEData<typeof routeIV>;
    expectTypeOf<EDataIV>().toBeNever();
  });

  test("res.end and responseData", () => {
    const route = dredgeRoute()
      .path("/test")
      .get()
      .use((_req, res) => {
        return res.end({
          data: "this is string" as const,
        });
      });

    type OData = inferRouteOData<typeof route>;
    expectTypeOf<OData>().toEqualTypeOf<"this is string">();
  });

  test("route.output and responseData", () => {
    const route = dredgeRoute()
      .path("/test")
      .get()
      .output(z.enum(["a", "b", "c"]))
      .use((_req, res) => {
        return res.end({
          data: "a",
        });
      });

    type OData = inferRouteOData<typeof route>;
    expectTypeOf<OData>().toEqualTypeOf<"a" | "b" | "c">();
  });

  test("res.data should always be `any`", () => {
    dredgeRoute()
      .path("/test")
      .get()
      .use((_req, res) => {
        expectTypeOf(res.data).toBeAny();
      })
      .use(() => {})
      .use((_req, res) => {
        expectTypeOf(res.data).toBeAny();
        return res.next({
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
        return res.next({
          data: [1, 2, 3],
        });
      })
      .error((_err, _req, res) => {
        expectTypeOf(res.data).toBeAny();
      });
  });

  test("res.status and res.statusText", () => {
    dredgeRoute()
      .path("/test")
      .get()
      .use((_req, res) => {
        expectTypeOf(res.status).toEqualTypeOf<number | undefined>();
        expectTypeOf(res.statusText).toEqualTypeOf<string | undefined>();
      })
      .error((_err, _req, res) => {
        expectTypeOf(res.status).toEqualTypeOf<number | undefined>();
        expectTypeOf(res.statusText).toEqualTypeOf<string | undefined>();
      });
  });
});
