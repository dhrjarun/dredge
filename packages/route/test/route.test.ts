import { assert, describe, expect, test } from "vitest";
import { dredgeRoute } from "../source/route";

describe("route.options()", () => {
  test("dataType should be in route._def", () => {
    const route = dredgeRoute()
      .options({
        dataTypes: {
          json: "application/json",
          formData: "multipart/form-data",
        },
      })
      .options({
        dataTypes: {
          xml: "application/xml",
          yaml: "multipart/yaml",
        },
      });

    expect(route._def.dataTypes).toStrictEqual({
      json: "application/json",
      formData: "multipart/form-data",
      xml: "application/xml",
      yaml: "multipart/yaml",
    });
  });

  test("invalid dataTypes will throw error", () => {
    expect(() => {
      dredgeRoute().options({
        dataTypes: {
          status: "any/any",
        },
      });
    });

    expect(() => {
      dredgeRoute().options({
        dataTypes: {
          data: "any/any",
        },
      });
    });

    expect(() => {
      dredgeRoute().options({
        dataTypes: {
          statusText: "any/any",
        },
      });
    });
  });

  test("if a dataType are provided more than once, the later ones are rejected", () => {
    const route = dredgeRoute()
      .options({
        dataTypes: {
          a: "a",
          b: "b",
        },
      })
      .options({
        dataTypes: {
          a: "aaa",
          c: "c",
          d: "d",
        },
      });

    expect(route._def.dataTypes).toStrictEqual({
      a: "a",
      b: "b",
      c: "c",
      d: "d",
    });
  });
});

describe("route.path()", () => {
  test("paths should be registered in _def", () => {
    let route = dredgeRoute().path("universe/milky-way/solar-system/:planet/");
    expect(route._def.paths).toStrictEqual([
      "universe",
      "milky-way",
      "solar-system",
      ":planet",
    ]);

    route = dredgeRoute().path("/universe/milky-way/solar-system/:planet");
    expect(route._def.paths).toStrictEqual([
      "universe",
      "milky-way",
      "solar-system",
      ":planet",
    ]);
  });

  test("multiple path() call should work", () => {
    let route = dredgeRoute()
      .path("/universe/milky-way")
      .path("/solar-system/:planet");

    expect(route._def.paths).toStrictEqual([
      "universe",
      "milky-way",
      "solar-system",
      ":planet",
    ]);
  });

  test("dynamic path should be unique", () => {
    expect(() =>
      dredgeRoute().path("/universe/:galaxy").path(":galaxy/"),
    ).toThrowError("galaxy");
    expect(() => dredgeRoute().path("/universe/:galaxy/:galaxy/")).toThrowError(
      "galaxy",
    );
  });
});

describe("route.params()", () => {
  test("params should be added in route._def", () => {
    const route = dredgeRoute()
      .path("/test/:par")
      .params({ par: (p) => p });

    assert.property(route._def.params, "par");
  });

  test("param must be defined first in the path", () => {
    expect(() =>
      dredgeRoute()
        .path("/test")
        .params({ noParam: (p: any) => p }),
    ).toThrowError("noParam");
  });

  test("one param can only be defined once", () => {
    expect(() =>
      dredgeRoute()
        .path("/test/:para")
        .params({ para: (p) => p })
        .params({
          para: (p: any) => p,
        }),
    ).toThrowError("para");
  });
});

describe("route.searchParams()", () => {
  test("searchParams should be added in route._def", () => {
    const route = dredgeRoute()
      .path("/test")
      .searchParams({ SPi: () => {}, SPii: () => {} })
      .searchParams({
        SPiii: (p) => p,
      });

    assert.property(route._def.searchParams, "SPi");
    assert.property(route._def.searchParams, "SPii");
    assert.property(route._def.searchParams, "SPiii");
  });

  test("one searchParam can only be defined once", () => {
    expect(() => {
      dredgeRoute()
        .path("/test")
        .searchParams({ SPi: (p) => p })
        .searchParams({
          SPi: (p) => p,
          SPii: (p) => p,
        });
    }).toThrowError("SPi");
  });
});

describe("route.<method>()", () => {
  test("should register both method and body parser in _def", () => {
    const methodsWithoutBody = ["get", "delete", "head"] as const;
    methodsWithoutBody.forEach((method) => {
      const getRoute = dredgeRoute().path("/test")[method]();
      expect(getRoute._def.method).toBe(method);
    });

    const methodWithBody = ["post", "patch", "put"] as const;
    const parser = (v: any) => v;
    methodWithBody.forEach((method) => {
      const postRoute = dredgeRoute().path("/test")[method](parser);
      expect(postRoute._def.method).toBe(method);
      expect(postRoute._def.iBody).toBe(parser);
    });
  });

  test("method functions can be only called once", () => {
    expect(() => {
      dredgeRoute().path("/test").get().delete();
    }).toThrowError();

    expect(() => {
      dredgeRoute()
        .path("/test")
        .post(() => {})
        .patch(() => {});
    }).toThrowError();
  });
});

describe("route.<middleware>()", () => {
  test("should register middleware", () => {
    const lastMiddleware = () => {};
    const route = dredgeRoute()
      .use(() => {})
      .use(lastMiddleware);

    expect(route._def.middlewares).toHaveLength(2);
    expect(route._def.middlewares[1]).toBe(lastMiddleware);
  });
  test("should register error middleware", () => {
    const lastMiddleware = () => {};
    const route = dredgeRoute()
      .error(() => {})
      .error(() => {})
      .error(lastMiddleware);

    expect(route._def.errorMiddlewares).toHaveLength(3);
    expect(route._def.errorMiddlewares[2]).toBe(lastMiddleware);
  });
});
