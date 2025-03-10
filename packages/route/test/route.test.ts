import { assert, describe, expect, test } from "vitest";
import { dredgeRoute } from "../source/route";

describe("route.options()", () => {
  test("throws when given invalid dataTypes", () => {
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
  test("route._schema.paths", () => {
    let route = dredgeRoute().path("universe/milky-way/solar-system/:planet/");
    expect(route._schema.paths).toStrictEqual([
      "universe",
      "milky-way",
      "solar-system",
      ":planet",
    ]);

    route = dredgeRoute().path("/universe/milky-way/solar-system/:planet");
    expect(route._schema.paths).toStrictEqual([
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

    expect(route._schema.paths).toStrictEqual([
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
  test("route._schema.params", () => {
    const route = dredgeRoute()
      .path("/test/:par")
      .params({ par: (p) => p });

    assert.property(route._schema.params, "par");
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
  test("route._schema.queries", () => {
    const route = dredgeRoute()
      .path("/test")
      .params({ SPi: () => {}, SPii: () => {} })
      .params({
        SPiii: (p) => p,
      });

    assert.property(route._schema.params, "SPi");
    assert.property(route._schema.params, "SPii");
    assert.property(route._schema.params, "SPiii");
  });

  test("throws when a key is defined more than once", () => {
    expect(() => {
      dredgeRoute()
        .path("/test")
        .params({ SPi: (p) => p })
        .params({
          SPi: (p) => p,
          SPii: (p) => p,
        });
    }).toThrowError("SPi");
  });
});

describe("route.input()", () => {
  test("route._schema.input", () => {
    const schema = (v: any) => v;
    const route = dredgeRoute().path("/test").input(schema);
    expect(route._schema.input).toBeDefined();
  });

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
  test("route._schema.ouptut", () => {
    const schema = (v: any) => v;
    const route = dredgeRoute().path("/test").output(schema);
    expect(route._schema.output).toBeDefined();
  });
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
  test("route._schema.method", () => {
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
      expect(getRoute._schema.method).toBe(method);
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

describe.todo("route._handle");
