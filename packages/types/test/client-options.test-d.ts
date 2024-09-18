import { expectTypeOf, test } from "vitest";
import { dredgeRoute } from "./helpers/dredge-route";
import { dredgeRouter } from "./helpers/dredge-router";
import { inferDredgeClientOption } from "../source/client/dredge-client-option";
import { DistributiveIndex, inferRouterRoutes } from "../source";
import { z } from "zod";

test("options.method", () => {
  const getPostPutRouter = dredgeRouter([
    dredgeRoute().path("/a").get().build(),
    dredgeRoute().path("/b").post().build(),
    dredgeRoute().path("/c").put().build(),
  ]);

  type GetPostPutRouter = inferRouterRoutes<typeof getPostPutRouter>;
  type GetPostPutOptions = inferDredgeClientOption<GetPostPutRouter[number]>;

  expectTypeOf<GetPostPutOptions["method"]>().toEqualTypeOf<
    "get" | "post" | "put"
  >();

  const deletePatchHeadRouter = dredgeRouter([
    dredgeRoute().path("/d").delete().build(),
    dredgeRoute().path("/e").patch().build(),
    dredgeRoute().path("/f").head().build(),
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
    r.path("/a").get().build(),
    r.path("/b").post(z.string()).build(),
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
    r.path("/a").get().build(),
    r.path("/b").get().build(),
    r.path("/c").get().build(),
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
    r.path("/a/:b").get().build(),
    r
      .path("/c/:d/:e")
      .params({
        d: z.number(),
        e: z.enum(["a", "b"]),
      })
      .get()
      .build(),
    r
      .path("/f/g/:h/:i/:j")
      .params({
        h: z.string(),
        i: z.boolean(),
        j: z.date(),
      })
      .get()
      .build(),
    // r.path('/k').get().build(), // TODO: fix this
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
    r.path("/a").get().build(),
    r
      .path("/c")
      .searchParams({
        d: z.number(),
        e: z.enum(["a", "b"]),
      })
      .get()
      .build(),
    r
      .path("/f")
      .searchParams({
        h: z.string(),
        i: z.boolean(),
        j: z.date(),
      })
      .get()
      .build(),
    r
      .path("/k")
      .get()
      .build(), // TODO: fix this
  ]);

  type Router = inferRouterRoutes<typeof router>;
  type SearchParams = inferDredgeClientOption<Router[number]>["searchParams"];

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
test.todo("options.data should not exist if method does not suport it");
test("options.data", () => {
  const r = dredgeRoute().options({
    dataTypes: {
      json: "application/json",
      form: "application/x-www-form-urlencoded",
      text: "text/plain",
    },
  });

  const router = dredgeRouter([
    r.path("/a").get().build(),
    r.path("/c").put(z.number()).build(),
    r.path("/b").post(z.string()).build(),
    r
      .path("/c")
      .patch(z.object({ a: z.string() }))
      .build(),
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
