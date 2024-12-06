import { describe, expect, test } from "vitest";
import { dredgeRoute } from "../source/route";
import {
  useErrorMiddlewares,
  useSuccessMiddlewares,
} from "../source/route-invocation";

describe("res.up()", () => {
  test("executes all success middlewares", async () => {
    const route = dredgeRoute()
      .path("/test")
      .get()
      .use((_req, res, next) => {
        res.up({
          headers: {
            "Content-Type": "application/json",
          },
        });
        next();
      })
      .use((_req, res, next) => {
        res.up({
          status: 200,
          statusText: "ok",
        });
        next();
      })
      .use((_req, res) => {
        return res.up({
          data: "dummy-data",
        });
      });

    const response = await useSuccessMiddlewares(route)({
      method: "get",
      url: "/test",
      params: {},
      queries: {},
      headers: {},
    });

    expect(response.headers).toStrictEqual({
      "content-type": "application/json",
    });
    expect(response.status).toBe(200);
    expect(response.statusText).toBe("ok");
    expect(response.data).toBe("dummy-data");
  });
  test("executes all error middlewares", async () => {
    const route = dredgeRoute()
      .path("/test")
      .get()
      .use(() => {
        throw "any";
      })
      .error((_err, _req, res) => {
        res.up({
          headers: {
            "Content-Type": "application/json",
          },
        });
      })
      .error((_err, _req, res) => {
        res.up({
          status: 404,
          statusText: "not-found",
        });
      })
      .error((_err, _req, res) => {
        return res.up({
          data: "dummy-data",
        });
      });

    const response = await useErrorMiddlewares(route)(new Error("test-error"), {
      method: "get",
      url: "/test",
      params: {},
      queries: {},
      headers: {},
    });

    expect(response.headers).toStrictEqual({
      "content-type": "application/json",
    });
    expect(response.status).toBe(404);
    expect(response.statusText).toBe("not-found");
    expect(response.data).toBe("dummy-data");
  });
});
