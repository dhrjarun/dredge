import { describe, expect, test } from "vitest";
import { z } from "zod";
import { dredgeRoute } from "../source/route";
import { ValidationError, dredgeRouter } from "../source/router";

const prefixUrl = "https://life.com";

describe("execution flow", () => {
  test("it will throw, if request did not matched", () => {
    const router = dredgeRouter([
      dredgeRoute().path("/test-i").get().build(),
      dredgeRoute().path("test-ii/:param/end").post().build(),
      dredgeRoute().path("test-iii").delete().build(),
    ]);

    expect(
      router.call("/test-i/param/end", {
        method: "post",
      }),
    ).rejects.toThrowError();

    expect(
      router.call("/test-ii/param/end", {
        method: "post",
      }),
    ).resolves.toMatchObject({});

    expect(
      router.call("/test-iii", {
        method: "post",
      }),
    ).rejects.toThrowError();

    expect(
      router.call("/test-iii", {
        method: "delete",
      }),
    ).resolves.toMatchObject({});
  });

  test("all success middleware should run", async () => {
    const router = dredgeRouter([
      dredgeRoute()
        .path("/test")
        .get()
        .use((req, res) => {
          return res.next({
            headers: {
              "Content-Type": "application/json",
            },
          });
        })
        .use((req, res) => {
          return res.next({
            status: 200,
            statusText: "ok",
          });
        })
        .use((req, res) => {
          return res.next({
            data: "dummy-data",
          });
        })
        .build(),
    ]);

    const response = await router.call("/test", {
      method: "get",
    });

    expect(response.headers).toStrictEqual({
      "content-type": "application/json",
    });
    expect(response.status).toBe(200);
    expect(response.statusText).toBe("ok");
    expect(response.data).toBe("dummy-data");
  });

  test("all error middleware should run", async () => {
    const router = dredgeRouter([
      dredgeRoute()
        .path("/test")
        .get()
        .use(() => {
          throw "any";
        })
        .error((err, req, res) => {
          return res.next({
            headers: {
              "Content-Type": "application/json",
            },
          });
        })
        .error((err, req, res) => {
          return res.next({
            status: 404,
            statusText: "not-found",
          });
        })
        .error((err, req, res) => {
          return res.next({
            data: "dummy-data",
          });
        })
        .build(),
    ]);

    const response = await router.call("/test", {
      method: "get",
    });

    expect(response.headers).toStrictEqual({
      "content-type": "application/json",
    });
    expect(response.status).toBe(404);
    expect(response.statusText).toBe("not-found");
    expect(response.data).toBe("dummy-data");
  });

  test("res.end() function should skip the rest of the success middleware", async () => {
    const router = dredgeRouter([
      dredgeRoute()
        .path("/test")
        .get()
        .use((req, res) => {
          return res.next({
            headers: {
              "Content-Type": "application/json",
            },
          });
        })
        .use((req, res) => {
          return res.end({
            status: 200,
            statusText: "ok",
          });
        })
        .use((req, res) => {
          return res.next({
            data: "dummy-data",
            status: 201,
            statusText: "created",
          });
        })
        .build(),
    ]);

    const response = await router.call("/test", {
      method: "get",
    });

    expect(response.headers).toStrictEqual({
      "content-type": "application/json",
    });
    expect(response.status).toBe(200);
    expect(response.statusText).toBe("ok");
    expect(response.data).toBe(undefined);
  });

  test("res.end() function should skip the rest of the error middleware", async () => {
    const router = dredgeRouter([
      dredgeRoute()
        .path("/test")
        .get()
        .use(() => {
          throw "any";
        })
        .error((err, req, res) => {
          return res.next({
            headers: {
              "Content-Type": "application/json",
            },
          });
        })
        .error((err, req, res) => {
          return res.end({
            status: 404,
            statusText: "not-found",
          });
        })
        .error((err, req, res) => {
          return res.next({
            data: "dummy-data",
            status: 400,
            statusText: "bad-data",
          });
        })
        .build(),
    ]);

    const response = await router.call("/test", {
      method: "get",
    });

    expect(response.headers).toStrictEqual({
      "content-type": "application/json",
    });
    expect(response.status).toBe(404);
    expect(response.statusText).toBe("not-found");
    expect(response.data).toBe(undefined);
  });
});

describe("req", () => {
  let route = dredgeRoute().path("/universe/:galaxy/solar-system/:planet");

  test("valid req.url and req.method", async () => {
    const path = "/universe/milky-way/solar-system/earth";
    const router = dredgeRouter([
      dredgeRoute()
        .path("/universe/:galaxy/solar-system/:planet")
        .get()
        .use((req) => {
          expect(req.method).toBe("get");
          expect(req.url).toBe(prefixUrl + path);

          throw "DBT";
        })
        .error((err, req) => {
          if (err !== "DBT") throw err;

          expect(req.method).toBe("get");
          expect(req.url).toBe(prefixUrl + path);
        })
        .build(),
    ]);

    await router.call(path, {
      method: "get",
      ctx: {},
      prefixUrl,
    });
  });

  test("param method should return valid params", async () => {
    const path = "/universe/milky-way/solar-system/earth";
    const router = dredgeRouter([
      route
        .params({
          planet: z
            .enum(["earth", "venus", "mars"])
            .transform((arg) => arg.toUpperCase()),
        })
        .get()
        .use((req) => {
          expect(req.param("galaxy")).toBe("milky-way");
          expect(req.param("planet")).toBe("EARTH");
          expect(req.param("continent")).toBe("asia");

          expect(req.param()).toStrictEqual({
            galaxy: "milky-way",
            planet: "EARTH",
            continent: "asia",
          });

          throw "DBT";
        })
        .path("/:continent")
        .error((err, req) => {
          if (err !== "DBT") throw err;

          expect(req.param("galaxy")).toBe("milky-way");
          expect(req.param("planet")).toBe("earth");
          expect(req.param("continent")).toBe("asia");

          expect(req.param()).toStrictEqual({
            galaxy: "milky-way",
            planet: "earth",
            continent: "asia",
          });
        })
        .build(),
    ]);

    await router.call(path + "/asia", {
      method: "get",
      ctx: {},
      prefixUrl: "https://life.com",
    });
  });

  test("searchParam method should return valid searchParam", async (t) => {
    const router = dredgeRouter([
      dredgeRoute()
        .path("/test")
        .searchParams({
          page: z
            .string()
            .regex(/[0-9]+/)
            .transform((arg) => Number(arg)),
          skip: z
            .string()
            .regex(/[0-9]+/)
            .transform((arg) => Number(arg)),
        })
        .get()
        .use((req) => {
          expect(req.searchParam("page")).toBe(2);

          expect(req.searchParam()).toStrictEqual({
            page: 2,
            skip: 5,
          });

          throw "DBT";
        })
        .searchParams({})
        .error((err, req) => {
          if (err !== "DBT") throw err;

          expect(req.searchParam("page")).toBe("02");

          expect(req.searchParam()).toStrictEqual({
            page: "02",
            skip: "005",
          });
        })
        .build(),
    ]);

    await router.call("/test", {
      method: "get",
      ctx: {},
      prefixUrl,
      searchParams: {
        page: ["02", "005"],
        skip: "005",
      },
    });
  });

  test("searchParams method should return valid searchParam", async (t) => {
    const router = dredgeRouter([
      dredgeRoute()
        .path("/test")
        .searchParams({
          page: z
            .string()
            .regex(/[0-9]+/)
            .transform((arg) => Number(arg)),
          skip: z
            .string()
            .regex(/[0-9]+/)
            .transform((arg) => Number(arg)),
        })
        .get()
        .use((req) => {
          expect(req.searchParams("page")).toStrictEqual([2, 5]);
          expect(req.searchParams("skip")).toStrictEqual([5]);

          expect(req.searchParams()).toStrictEqual({
            page: [2, 5],
            skip: [5],
          });

          throw "DBT";
        })
        .searchParams({})
        .error((err, req) => {
          if (err !== "DBT") {
            throw err;
          }

          expect(req.searchParams("page")).toStrictEqual(["02", "005"]);
          expect(req.searchParams("skip")).toStrictEqual(["005"]);

          expect(req.searchParams()).toStrictEqual({
            page: ["02", "005"],
            skip: ["005"],
          });
        })
        .build(),
    ]);

    await router.call("/test", {
      method: "get",
      ctx: {},
      prefixUrl,
      searchParams: {
        page: ["02", "005"],
        skip: "005",
      },
    });
  });

  test("data should be in req object", () => {
    const router = dredgeRouter([
      dredgeRoute()
        .path("/test")
        .post(z.string().toUpperCase())
        .use((req) => {
          expect(req.data).toBe("TEST-DATA");

          throw "DBT";
        })
        .error((err, req) => {
          if (err !== "DBT") throw err;

          expect(req.data).toBe("test-data");
        })
        .build(),
    ]);

    router.call("/test", {
      prefixUrl,
      method: "post",
      ctx: {},
      data: "test-data",
    });
  });

  test("data should be transformed", async () => {
    const router = dredgeRouter([
      dredgeRoute()
        .options({
          dataTypes: {
            json: "application/json",
          },
          dataTransformer: {
            json: {
              forRequest: (data) => {
                return { json: data };
              },
              forResponse: (data) => {
                return { resData: data };
              },
            },
          },
        })
        .path("/test")
        .get()
        .use((req, res) => {
          expect(req.data).toStrictEqual({
            json: "dummy-data",
          });

          return res.end({
            data: "dummy-data",
          });
        })
        .error((err) => {
          if (err !== "DBT") throw err;
        })
        .build(),
    ]);

    const res = await router.call("/test", {
      method: "get",
      data: "dummy-data",
      dataType: "json",
    });

    expect(res.data).toStrictEqual({ resData: "dummy-data" });
  });

  test("req.header should return headers", () => {
    const router = dredgeRouter([
      dredgeRoute()
        .path("/test")
        .put(z.string())
        .use((req) => {
          expect(req.header("content-Type")).toBe("application/json");
          expect(req.header("Content-Type")).toBe("application/json");
          expect(req.header("content-type")).toBe("application/json");

          expect(req.header()).toBeTypeOf("object");

          throw "DBT";
        })
        .error((err, req) => {
          if (err !== "DBT") throw err;

          expect(req.header("content-Type")).toBe("application/json");
          expect(req.header("Content-Type")).toBe("application/json");
          expect(req.header("content-type")).toBe("application/json");

          expect(req.header()).toBeTypeOf("object");
        })
        .build(),
    ]);

    router.call("/test", {
      prefixUrl,
      method: "put",
      data: "test-data",
      headers: {
        "Content-Type": "application/json",
        "Accept-Encoding": "gzip",
      },
    });
  });
});

describe("res object", () => {
  test("defaultContext should be merged", () => {
    const router = dredgeRouter([
      dredgeRoute<{ db: any; session: { username: string }; local: any }>()
        .options({
          defaultContext: {
            db: "fake-db",
            session: {
              username: "fake-user",
            },
          },
        })
        .path("/test")
        .get()
        .use((req, res) => {
          expect(res.ctx).toStrictEqual({
            db: "test-db",
            local: "LOCAL",
            session: {
              username: "fake-user",
            },
          });

          throw "DBT";
        })
        .error((err) => {
          if (err !== "DBT") throw err;
        })
        .error((err, req, res) => {
          expect(res.ctx).toStrictEqual({
            db: "test-db",
            local: "LOCAL",
            session: {
              username: "fake-user",
            },
          });
        })
        .build(),
    ]);

    router.call("/test", {
      ctx: {
        db: "test-db",
        local: "LOCAL",
      },
    });
  });

  test("res.next should modify the response", () => {
    function initialCheck(res: any) {
      expect(res.status).toBeUndefined();
      expect(res.statusText).toBeUndefined();
      expect(res.data).toBeUndefined();
      expect(res.ctx).toStrictEqual({
        db: "fake-db",
      });
      expect(res.header()).toStrictEqual({});
    }

    function afterModificationCheck(res: any) {
      expect(res.status).toBe(200);
      expect(res.statusText).toBe("ok");
      expect(res.ctx).toStrictEqual({
        db: "fake-db",
        isInitialCheckDone: true,
      });

      expect(res.header("content-type")).toBe("application/json");
      expect(res.header("content-Type")).toBe("application/json");

      expect(res.data).toBe("response-data");
    }

    const router = dredgeRouter([
      dredgeRoute<{ db: "fake-db" }>()
        .path("/test")
        .get()
        .use((req, res) => {
          initialCheck(res);

          return res.next({
            status: 200,
            statusText: "ok",
            ctx: {
              isInitialCheckDone: true,
            },
            data: "response-data",
            headers: {
              "content-Type": "application/json",
            },
          });
        })
        .use((req, res) => {
          afterModificationCheck(res);
        })
        .error((err) => {
          if (err !== "DBT") throw err;
        })
        .error((err, req, res) => {
          initialCheck(res);

          return res.next({
            status: 200,
            statusText: "ok",
            ctx: {
              isInitialCheckDone: true,
            },
            data: "initial-check",
          });
        })
        .error((err, req, res) => {
          afterModificationCheck(res);
        })
        .build(),
    ]);

    router.call("/test", {
      ctx: { db: "fake-db" },
    });
  });

  test("dataType in res.next", async () => {
    const router = dredgeRouter([
      dredgeRoute()
        .options({
          dataTypes: {
            json: "application/json",
            formData: "multipart/form-data",
          },
        })
        .path("/test")
        .get()
        .use((req, res) => {
          expect(res.dataType).toBeUndefined();

          return res.next({
            json: { payload: null },
          });
        })
        .use((req, res) => {
          expect(res.dataType).toBe("json");
          expect(res.data).toStrictEqual({ payload: null });

          throw "DBT";
        })
        .error((err) => {
          if (err !== "DBT") throw err;
        })
        .error((err, req, res) => {
          expect(res.dataType).toBeUndefined();

          return res.next({
            json: { payload: null },
          });
        })
        .error((err, req, res) => {
          expect(res.dataType).toBe("json");
          expect(res.data).toStrictEqual({ payload: null });
        })
        .build(),
    ]);

    await router.call("/test", {
      method: "get",
    });
  });
});

describe("Validation", () => {
  const spRoute = dredgeRoute()
    .path("/sp")
    .searchParams({
      required: z.string(),
      optional: z.string().optional(),
    })
    .get()
    .use((req) => {
      expect(req.searchParam("required")).toBe("i am required");

      expect(req.searchParam()).toMatchObject({
        required: "i am required",
      });
    })
    .searchParams({});

  test("optional searchParam should work", async () => {
    const router = dredgeRouter([
      spRoute
        .error((err) => {
          throw err;
        })
        .build(),
    ]);

    await router.call("sp", {
      method: "get",
      ctx: {},
      prefixUrl,
      searchParams: {
        required: "i am required",
      },
    });

    await router.call("sp", {
      method: "get",
      ctx: {},
      prefixUrl,
      searchParams: {
        required: "i am required",
        optional: "i am optional",
      },
    });
  });

  test("required searchParam if not provided, will throw", async () => {
    const router = dredgeRouter([
      spRoute
        .use(() => {
          throw "no-needed";
        })
        .error((err) => {
          expect(err).instanceOf(ValidationError);
          expect(err.type).toBe("SEARCH_PARAMS");
        })
        .build(),
    ]);

    await router.call("sp", {
      method: "get",
      ctx: {},
      prefixUrl,
      searchParams: {
        optional: "i am optional",
      },
    });
  });
});
