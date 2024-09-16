import { expectTypeOf, test } from "vitest";
import { z } from "zod";
import { inferPathArray } from "../source";
import { Route, UnresolvedRoute } from "../source/route/dredge-route";
import {
  inferRouteFirstPath,
  inferRouteParamPath,
  inferRouteSecondPath,
} from "../source/route/route-path";
import { inferRouterRoutes } from "../source/router";
import { Merge } from "../source/utils";
import { dredgeRoute } from "./helpers/dredge-route";
import { dredgeRouter } from "./helpers/dredge-router";

type CreateDredgeRoute<
  Options extends {
    options?: {
      dataTypes?: Record<string, string>;
      withDynamicPath?: boolean;
      initialContext?: any;
    };
    params?: Record<string, any>;
    searchParams?: Record<string, any>;
    successContext?: any;
    errorContext?: any;
    method?: "get" | "post" | "put" | "delete" | "patch" | "head";
    paths?: string;
    iData?: any;
    oData?: any;
    eData?: any;
  },
> = Route<
  Merge<
    {
      dataTypes: {};
      initialContext: {};
      withDynamicPath: false;
      modifiedInitialContext: {};
    },
    Options["options"]
  >,
  Options["successContext"],
  Options["errorContext"],
  Options["method"],
  inferPathArray<Options["paths"]>,
  Options["params"],
  Options["searchParams"],
  Options["iData"],
  Options["oData"],
  Options["eData"]
>;

test("ParamPath only reutrn for route containing dynamic path", () => {
  const testRouter = dredgeRouter([
    dredgeRoute().path("/a/:b").build(),
    dredgeRoute().path("/:x/y/z").build(),
    dredgeRoute().path("/m/n/:o").get().build(),
    dredgeRoute().path("/a").build(),
    dredgeRoute().path("/x/y/z").build(),
    dredgeRoute().path("/x/:y/z").build(),
  ]);
  type TestRouter = typeof testRouter;

  type Routes = inferRouterRoutes<TestRouter>;

  type ParamPath = inferRouteParamPath<Routes[number]>;

  expectTypeOf<ParamPath>().toEqualTypeOf<
    ":/a/:b" | ":/:x/y/z" | ":/m/n/:o" | ":/x/:y/z"
  >();
});

const testRouter = dredgeRouter([
  dredgeRoute().path("/a/b/c/d").build(),
  dredgeRoute().path("/:a/b/c/d").build(),
  dredgeRoute()
    .path("/a/:b/c/d")
    .params({
      b: z.number(),
    })
    .build(),
  dredgeRoute()
    .path("/a/b/:c/d")
    .params({
      c: z.bigint(),
    })
    .build(),
  dredgeRoute()
    .path("/a/b/c/:d")
    .params({
      d: z.date(),
    })
    .build(),

  dredgeRoute().path("/e/f/g/h").build(),
  dredgeRoute()
    .path("/:e/f/g/h")
    .params({
      e: z.enum(["a", "b"]),
    })
    .build(),
  dredgeRoute()
    .path("/e/:f/g/h")
    .params({
      f: z.boolean(),
    })
    .build(),

  dredgeRoute()
    .path("/e/f/:g/h")
    .params({
      g: z.undefined(),
    })
    .build(),

  dredgeRoute()
    .path("/e/f/g/:h")
    .params({
      h: z.null(),
    })
    .build(),

  dredgeRoute().path("/s/t/u/v/w/x").build(),
  dredgeRoute()
    .path("/:s/t/:u/v/w/x")
    .params({
      s: z.string(),
      u: z.number(),
    })
    .build(),
  dredgeRoute()
    .path("/s/:t/u/:v/w/x")
    .params({
      t: z.number(),
      v: z.bigint(),
    })
    .build(),
  dredgeRoute()
    .path("/s/t/u/v/:w/:x")
    .params({
      w: z.bigint(),
      x: z.date(),
    })
    .build(),

  dredgeRoute().path("/p/q/r/s/t/u").build(),
  dredgeRoute()
    .path("/:p/q/:r/s/t/u")
    .params({
      p: z.enum(["a", "b"]),
      r: z.boolean(),
    })
    .build(),
  dredgeRoute()
    .path("/p/:q/r/:s/t/u")
    .params({
      q: z.boolean(),
      s: z.undefined(),
    })
    .build(),
  dredgeRoute()
    .path("/p/q/r/s/:t/:u")
    .params({
      t: z.undefined(),
      u: z.null(),
    })
    .build(),
]);

type TestRouter = typeof testRouter;
type Routes = inferRouterRoutes<TestRouter>;

test("autcompletable paths", () => {
  const testRouter = dredgeRouter([
    dredgeRoute().path("/a/b/c/d").build(),
    dredgeRoute().path("/:a/b/c/d").build(),
    dredgeRoute().path("/a/:b/c/d").build(),

    dredgeRoute().path("/x/y/z/a").build(),
    dredgeRoute().path("/x/y/z/:a").build(),
    dredgeRoute()
      .path("/x/:y/z/a")
      .params({
        y: z.enum(["1", "2"]),
      })
      .build(),
    dredgeRoute().path("/m/n/o").build(),
    dredgeRoute().path("/m/:n").build(),
    dredgeRoute()
      .path("/o/:p")
      .params({
        p: z.boolean(),
      })
      .build(),
  ]);

  type TestRouter = typeof testRouter;
  type Routes = inferRouterRoutes<TestRouter>;
  type Path = inferRouteFirstPath<Routes[number]>;

  expectTypeOf<Path>().toEqualTypeOf<
    | "/a/b/c/d"
    | ":/:a/b/c/d"
    | ":/a/:b/c/d"
    | "/x/y/z/a"
    | ":/x/y/z/:a"
    | "/x/1/z/a"
    | "/x/2/z/a"
    | ":/x/:y/z/a"
    | "/m/n/o"
    | ":/m/:n"
    | "/o/true"
    | "/o/false"
    | ":/o/:p"
  >();
});
test("autocompletable paths", () => {
  type Path = inferRouteFirstPath<Routes[number]>;

  type SingleParam =
    | `/a/b/c/d`
    | `:/:a/b/c/d`
    | `/a/:b/c/d`
    | `/a/b/:c/d`
    | `/a/b/c/:d`
    | "e/f/g/h"
    | ":/e/f/g/h"
    | ":/e/:f/g/h"
    | ":/e/f/:g/h"
    | ":/e/f/g/:h"
    | "/a/f/g/h"
    | "/b/f/g/h"
    | "/e/true/g/h"
    | "/e/false/g/h"
    | "/e/f/undefined/h"
    | "/e/f/g/null";

  type DoubleParams =
    | "/s/t/u/v/w/x"
    | ":/:s/t/:u/v/w/x"
    | ":/s/:t/u/:v/w/x"
    | ":/s/t/u/v/:w/:x"
    | "/p/q/r/s/t/u"
    | ":/:p/q/:r/s/t/u"
    | ":/p/:q/r/:s/t/u"
    | ":/p/q/r/s/:t/:u"
    | "/a/r/true/t/u"
    | "/a/r/false/t/u"
    | "/b/r/true/t/u"
    | "/b/r/false/t/u"
    | "/p/true/r/undefined/t/u"
    | "/p/false/r/undefined/t/u"
    | "/p/q/r/s/undefined/null";

  expectTypeOf<Path>().toEqualTypeOf<SingleParam | DoubleParams>();
});

test("non-autocompletable paths", () => {
  type Path = inferRouteSecondPath<Routes[number]>;

  type SingleParam =
    | `/${string}/b/c/d`
    | `/a/${number}/c/d`
    | `/a/b/${bigint}/d`
    | `/a/b/c/${string}`;
  type DoubleParams =
    | `/${string}/t/${number}/v/w/x`
    | `/s/${number}/u/${bigint}/w/x`
    | `/s/t/u/v/${bigint}/${string}`;

  expectTypeOf<Path>().toEqualTypeOf<SingleParam | DoubleParams>();
});

type Generic = `/a/${string | number | bigint}`;

type s = Generic extends `/a/${string}` ? true : false; // true
type n = Generic extends `/a/${number}` ? true : false; // false
type b = Generic extends `/a/${bigint}` ? true : false; // false
type l = Generic extends `/a/${"b" | "c"}` ? true : false; // false

type ss = `/a/${string}` extends Generic ? true : false; // true
type nn = `/a/${number}` extends Generic ? true : false; // true
type bb = `/a/${bigint}` extends Generic ? true : false; // true
type ll = `/a/${"b" | "c"}` extends Generic ? true : false; // true

type sss = Extract<Generic, `/a/${string}`>; // Gerneric
type nnn = Extract<Generic, `/a/${number}`>; //`/a/${number}`
type bbb = Extract<Generic, `/a/${bigint}`>; // `/a/${bigint}`
type lll = Extract<Generic, `/a/${"b" | "c"}`>; // never
type ooo = Extract<Generic, `/a/${boolean}`>; // never
type v = Extract<Generic, `/a/${null}`>; // never
type uuu = Extract<Generic, `/a/${undefined}`>; // never

type ssss = Extract<"/a/${string}", Generic>; // `/a/${string}`
type nnnn = Extract<"/a/${number}", Generic>; // `/a/${number}`
type oooo = Extract<"/a/${boolean}", Generic>; // `/a/${boolean}`
