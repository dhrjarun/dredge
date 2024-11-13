import { assert, describe, expect, test } from "vitest";
import { dredgeRoute } from "../source/route";

describe("route.options()", () => {
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
  test("defines a param", () => {
    const route = dredgeRoute()
      .path("/test/:par")
      .params({ par: (p) => p });

    assert.property(route._def.params, "par");
  });

  test("throws when a key is defined before defining it in path", () => {
    expect(() =>
      dredgeRoute()
        .path("/test")
        .params({ noParam: (p: any) => p }),
    ).toThrowError("noParam");
  });

  test("throws when a key is defined more than once", () => {
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

describe("route.queries()", () => {
  test("queries should be added in route._def", () => {
    const route = dredgeRoute()
      .path("/test")
      .queries({ SPi: () => {}, SPii: () => {} })
      .queries({
        SPiii: (p) => p,
      });

    assert.property(route._def.queries, "SPi");
    assert.property(route._def.queries, "SPii");
    assert.property(route._def.queries, "SPiii");
  });

  test("throws when a key is defined more than once", () => {
    expect(() => {
      dredgeRoute()
        .path("/test")
        .queries({ SPi: (p) => p })
        .queries({
          SPi: (p) => p,
          SPii: (p) => p,
        });
    }).toThrowError("SPi");
  });
});

describe("route.input()", () => {
  test("throws when called more than once", () => {
    expect(() => {
      dredgeRoute()
        .path("/test")
        .get()
        .input((v) => v)
        .input((v) => v);
    }).toThrowError();
  });
});

describe("route.output()", () => {
  test("throws when called more than once", () => {
    expect(() => {
      dredgeRoute()
        .path("/test")
        .get()
        .output((v) => v)
        .output((v) => v);
    }).toThrowError();
  });
});

describe("route.<method>()", () => {
  test("should register method in _def", () => {
    const methodsWithoutBody = [
      "get",
      "delete",
      "head",
      "post",
      "patch",
      "put",
    ] as const;
    methodsWithoutBody.forEach((method) => {
      const getRoute = dredgeRoute().path("/test")[method]();
      expect(getRoute._def.method).toBe(method);
    });
  });

  test("throws when called more than once", () => {
    expect(() => {
      dredgeRoute().path("/test").get().delete();
    }).toThrowError();

    expect(() => {
      dredgeRoute().path("/test").post().patch();
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
