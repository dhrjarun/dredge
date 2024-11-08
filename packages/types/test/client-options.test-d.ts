import { expectTypeOf, test } from "vitest";
import { z } from "zod";
import { DistributiveIndex, inferRouterRoutes } from "../source";
import { inferDredgeClientOption } from "../source/client/dredge-client-option";
import { dredgeRoute } from "./helpers/dredge-route";
import { dredgeRouter } from "./helpers/dredge-router";

test("options.method", () => {
  const getPostPutRouter = dredgeRouter([
    dredgeRoute().path("/a").get(),
    dredgeRoute().path("/b").post(),
    dredgeRoute().path("/c").put(),
  ]);

  type GetPostPutRouter = inferRouterRoutes<typeof getPostPutRouter>;
  type GetPostPutOptions = inferDredgeClientOption<GetPostPutRouter[number]>;

  expectTypeOf<GetPostPutOptions["method"]>().toEqualTypeOf<
    "get" | "post" | "put"
  >();

  const deletePatchHeadRouter = dredgeRouter([
    dredgeRoute().path("/d").delete(),
    dredgeRoute().path("/e").patch(),
    dredgeRoute().path("/f").head(),
  ]);

  type DeletePatchHeadRouter = inferRouterRoutes<typeof deletePatchHeadRouter>;
  type DeletePatchHeadOptions = inferDredgeClientOption<
    DeletePatchHeadRouter[number]
  >;

  expectTypeOf<DeletePatchHeadOptions["method"]>().toEqualTypeOf<
    "delete" | "patch" | "head"
  >();
});

test("options.dataTypes", () => {
  const r = dredgeRoute().options({
    dataTypes: {
      json: "application/json",
      form: "application/x-www-form-urlencoded",
      text: "text/plain",
    },
  });

  const router = dredgeRouter([
    r.path("/a").get(),
    r.path("/b").post().input(z.string()),
  ]);

  type Router = inferRouterRoutes<typeof router>;
  type DataTypes = inferDredgeClientOption<Router[number]>["dataTypes"];

  expectTypeOf<DataTypes>().toEqualTypeOf<
    | {
        readonly json?: string | undefined;
        readonly form?: string | undefined;
        readonly text?: string | undefined;
      }
    | undefined
  >();
});

test("options.dataType and options.responseDataType", () => {
  const r = dredgeRoute().options({
    dataTypes: {
      json: "application/json",
      form: "application/x-www-form-urlencoded",
      text: "text/plain",
    },
  });

  const router = dredgeRouter([
    r.path("/a").get(),
    r.path("/b").get(),
    r.path("/c").get(),
  ]);

  type Router = inferRouterRoutes<typeof router>;
  type Options = inferDredgeClientOption<Router[number]>;

  expectTypeOf<Options["dataType"]>().toEqualTypeOf<
    "json" | "form" | "text" | undefined
  >();
  expectTypeOf<Options["responseDataType"]>().toEqualTypeOf<
    "json" | "form" | "text" | undefined
  >();
});

test.todo(
  "options.params should not exist if there are none defined in the route",
);

test("options.params", () => {
  const r = dredgeRoute();

  const router = dredgeRouter([
    r.path("/a/:b").get(),
    r
      .path("/c/:d/:e")
      .params({
        d: z.number(),
        e: z.enum(["a", "b"]),
      })
      .get(),
    r
      .path("/f/g/:h/:i/:j")
      .params({
        h: z.string(),
        i: z.boolean(),
        j: z.date(),
      })
      .get(),
    // r.path('/k').get(), // TODO: fix this, it causes some unneccary type in params type.
  ]);

  type Router = inferRouterRoutes<typeof router>;
  type Params = inferDredgeClientOption<Router[number]>["params"];

  expectTypeOf<Params>().toEqualTypeOf<
    | {
        b: string;
      }
    | { readonly d: number; readonly e: "a" | "b" }
    | { readonly h: string; readonly i: boolean; readonly j: Date }
  >();
});

test("options.searchParams", () => {
  const r = dredgeRoute();

  const router = dredgeRouter([
    r.path("/a").get(),
    r
      .path("/c")
      .queries({
        d: z.number(),
        e: z.enum(["a", "b"]),
      })
      .get(),
    r
      .path("/f")
      .queries({
        h: z.string(),
        i: z.boolean(),
        j: z.date(),
      })
      .get(),
    r
      .path("/k")
      .get(), // TODO: fix this
  ]);

  type Router = inferRouterRoutes<typeof router>;
  type SearchParams = inferDredgeClientOption<Router[number]>["queries"];

  expectTypeOf<SearchParams>().toEqualTypeOf<
    | Record<string, any>
    | {
        // TODO: see what to do with this, and where Record and undefined is coming from
        readonly d: number | number[];
        readonly e: "a" | "b" | ("a" | "b")[];
      }
    | {
        readonly h: string | string[];
        readonly i: boolean | boolean[];
        readonly j: Date | Date[];
      }
    | undefined
  >();
});
test("options.data", () => {
  const r = dredgeRoute().options({
    dataTypes: {
      json: "application/json",
      form: "application/x-www-form-urlencoded",
      text: "text/plain",
    },
  });

  const router = dredgeRouter([
    r.path("/a").get(),
    r.path("/c").put().input(z.number()),
    r.path("/b").post().input(z.string()),
    r
      .path("/c")
      .patch()
      .input(z.object({ a: z.string() })),
  ]);

  type Routes = inferRouterRoutes<typeof router>;
  type Options = inferDredgeClientOption<Routes[number]>;

  type ExpectedData = string | number | { a: string };
  expectTypeOf<
    DistributiveIndex<Options, "data">
  >().toEqualTypeOf<ExpectedData>();

  expectTypeOf<
    DistributiveIndex<Options, "json">
  >().toEqualTypeOf<ExpectedData>();

  expectTypeOf<
    DistributiveIndex<Options, "form">
  >().toEqualTypeOf<ExpectedData>();

  expectTypeOf<
    DistributiveIndex<Options, "text">
  >().toEqualTypeOf<ExpectedData>();
});
