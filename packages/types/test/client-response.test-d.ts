import { describe, expectTypeOf, test } from "vitest";
import { createClient } from "./helpers/dredge-client";
import { pathRouter } from "./path-routes";
import { dredgeRouter } from "./helpers/dredge-router";
import { dredgeRoute } from "./helpers/dredge-route";
import { z } from "zod";

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

const r = dredgeRoute().options({
  dataTypes: {
    json: "application/json",
    form: "application/x-www-form-urlencoded",
    text: "text/plain",
  },
});

test("infers `any` when route never return res.up() or pass data to it", async () => {
  const Router = dredgeRouter([
    r
      .path("/up-returned")
      .get()
      .use((_req, res) => {
        return res.up({
          status: 200,
        });
      }),
    r
      .path("/no-up-returned")
      .get()
      .use(() => {}),
  ]);

  const client = createClient<typeof Router>();

  expectTypeOf(await client.get("/up-returned").data()).toBeAny();
  expectTypeOf(await client.get("/no-up-returned").data()).toBeAny();

  expectTypeOf(await client.get("/up-returned").json()).toBeAny();
  expectTypeOf(await client.get("/no-up-returned").json()).toBeAny();

  expectTypeOf(await client.get("/up-returned").form()).toBeAny();
  expectTypeOf(await client.get("/no-up-returned").form()).toBeAny();

  expectTypeOf(await client.get("/up-returned").text()).toBeAny();
  expectTypeOf(await client.get("/no-up-returned").text()).toBeAny();
});

test("infers based on schema passed to `r.output()`", async () => {
  const Router = dredgeRouter([
    r
      .path("/string")
      .get()
      .output(z.string())
      .use((_req, res) => {
        return res.up({
          data: "a",
        });
      }),
    r
      .path("/number")
      .get()
      .output(z.number())
      .use((_req, res) => {
        return res.up({
          data: 1,
        });
      }),
    r
      .path("/boolean")
      .get()
      .output(z.boolean())
      .use((_req, res) => {
        return res.up({
          data: true,
        });
      }),
  ]);

  const client = createClient<typeof Router>();

  expectTypeOf(await client.get("/string").data()).toBeString();
  expectTypeOf(await client.get("/number").data()).toBeNumber();
  expectTypeOf(await client.get("/boolean").data()).toBeBoolean();

  expectTypeOf(await client.get("/string").json()).toBeString();
  expectTypeOf(await client.get("/number").json()).toBeNumber();
  expectTypeOf(await client.get("/boolean").json()).toBeBoolean();

  expectTypeOf(await client.get("/string").form()).toBeString();
  expectTypeOf(await client.get("/number").form()).toBeNumber();
  expectTypeOf(await client.get("/boolean").form()).toBeBoolean();

  expectTypeOf(await client.get("/string").text()).toBeString();
  expectTypeOf(await client.get("/number").text()).toBeNumber();
  expectTypeOf(await client.get("/boolean").text()).toBeBoolean();
});

test("infers type passed to `res.up( { data: ... } )` for the first time", async () => {
  const Router = dredgeRouter([
    dredgeRoute()
      .path("/string")
      .get()
      .use((_req, res) => {
        return res.up({
          data: "a",
        });
      }),
    dredgeRoute()
      .path("/number")
      .get()
      .use((_req, res) => {
        return res.up({
          data: 1,
        });
      }),
    dredgeRoute()
      .path("/boolean")
      .get()
      .use((_req, res) => {
        return res.up({
          data: true,
        });
      }),
  ]);

  const client = createClient<typeof Router>();

  expectTypeOf(await client.get("/string").data()).toBeString();
  expectTypeOf(await client.get("/number").data()).toBeNumber();
  expectTypeOf(await client.get("/boolean").data()).toBeBoolean();
});
