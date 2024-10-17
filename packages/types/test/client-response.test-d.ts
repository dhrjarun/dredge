import { describe, expectTypeOf, test } from "vitest";
import { createClient } from "./helpers/dredge-client";
import { pathRouter } from "./path-routes";

type PathRouter = typeof pathRouter;

describe("pathRoutes", () => {
  const client = createClient<PathRouter>();
  test("/a/b/c/d", async () => {
    expectTypeOf(
      await client.get("/a/b/c/d").data(),
    ).toEqualTypeOf<"GET/a/b/c/d">();

    expectTypeOf(
      await client("/a/b/c/d", {
        method: "get",
      }).data(),
    ).toEqualTypeOf<"GET/a/b/c/d">();

    expectTypeOf(
      await client.delete("/a/b/c/d").data(),
    ).toEqualTypeOf<"DELETE/a/b/c/d">();
  });

  test("/:a/b/c/d", async () => {
    type ExpectedPutType = "PUT/:a/b/c/d";
    expectTypeOf(
      await client.get("/param/b/c/d").data(),
    ).toEqualTypeOf<"GET/:a/b/c/d">();

    expectTypeOf(
      await client.put("/param/b/c/d").data(),
    ).toEqualTypeOf<"PUT/:a/b/c/d">();

    expectTypeOf(
      await client
        .put(":/:a/b/c/d", {
          params: {
            a: "param",
          },
        })
        .data(),
    ).toEqualTypeOf<ExpectedPutType>();

    expectTypeOf(
      await client("/param/b/c/d", {
        method: "put",
      }).data(),
    ).toEqualTypeOf<ExpectedPutType>();
  });

  test("/a/:b/c/d", async () => {
    expectTypeOf(
      await client.get("/a/1/c/d").data(),
    ).toEqualTypeOf<"GET/a/:b/c/d">();

    expectTypeOf(
      await client("/a/1/c/d", { method: "get" }).data(),
    ).toEqualTypeOf<"GET/a/:b/c/d">();

    expectTypeOf(
      await client(":/a/:b/c/d", { method: "get", params: { b: 2 } }).data(),
    ).toEqualTypeOf<"GET/a/:b/c/d">();
  });
});
