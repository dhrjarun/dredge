import { describe, expect, test } from "vitest";
import { z } from "zod";
import { dredgeRoute } from "../source/route";
import { ValidationError, dredgeRouter } from "../source/router";

describe("req", () => {
  const prefixUrl = "https://life.com";
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

  describe("req.searchParam", () => {
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

          console.log(req.searchParams());
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
});
