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

  test("invalid dataTypes will throw error", () => {});

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

  test("defaultContext should be in route._def", () => {
    const route = dredgeRoute<{
      db: any;
      local: any;
      session: { username: string };
    }>()
      .options({
        dataTypes: {
          json: "application/json",
          formData: "multipart/form-data",
        },
        defaultContext: {
          db: "fake-db",
          session: {
            username: "fake-user",
          },
        },
      })
      .options({
        defaultContext: {
          db: "test-db",
        },
      });

    expect(route._def.defaultContext).toStrictEqual({
      db: "test-db",
      session: {
        username: "fake-user",
      },
    });
  });

  test("dataTransformer should be in route._def", () => {
    const json = {
      forRequest: (data) => data,
      forResponse: (data) => data,
    };

    const route = dredgeRoute()
      .options({
        dataTypes: {
          json: "application/json",
          formData: "multipart/form-data",
        },
        dataTransformer: {
          json: {
            forRequest: json.forRequest,
          },
        },
      })
      .options({
        dataTransformer: {
          json: {
            forResponse: json.forResponse,
          },
        },
      });

    expect(route._def.dataTransformer.json).toStrictEqual(json);
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
        .params({ noParam: (p) => p }),
    ).toThrowError("noParam");
  });

  test("one param can only be defined once", () => {
    expect(() =>
      dredgeRoute()
        .path("/test/:para")
        .params({ para: (p) => p })
        .params({
          para: (p) => p,
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
    const methodsWithoutBody = ["get", "delete", "head"];
    methodsWithoutBody.forEach((method) => {
      const getRoute = dredgeRoute().path("/test")[method]();
      expect(getRoute._def.method).toBe(method);
    });

    const methodWithBody = ["post", "patch", "put"];
    const parser = (v) => v;
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

describe("route.build()", () => {
  test("if path and method is not there, it should throw", () => {
    expect(() => {
      dredgeRoute().path("/test").build();
    }).toThrowError();

    expect(() => {
      dredgeRoute().get().build();
    }).toThrowError();

    const router = dredgeRoute().path("/test").get().build();
    expect(router._def.isResolved).toBe(true);
  });
});
