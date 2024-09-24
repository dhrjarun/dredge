import { expectTypeOf, test } from "vitest";
import { z } from "zod";
import { Route, UnresolvedRoute } from "../source/route/dredge-route";
import {
  inferRouteFirstPath,
  inferRouteParamPath,
  inferRouteSecondPath,
} from "../source/route/route-path";
import { inferRouterRoutes } from "../source/router";
import { dredgeRoute } from "./helpers/dredge-route";
import { dredgeRouter } from "./helpers/dredge-router";
import {
  singleParamAutoRouter,
  singleParamNonAutoRouter,
  doubleParamAutoRouter,
  doubleParamNonAutoRouter,
} from "./path-routes";

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

type SingleParamNonAutoRouter = typeof singleParamNonAutoRouter;
type SingleParamAutoRouter = typeof singleParamAutoRouter;
type DoubleParamNonAutoRouter = typeof doubleParamNonAutoRouter;
type DoubleParamAutoRouter = typeof doubleParamAutoRouter;

type SingleParamNonAutoRouterRoutes =
  inferRouterRoutes<SingleParamNonAutoRouter>;
type SingleParamAutoRouterRoutes = inferRouterRoutes<SingleParamAutoRouter>;
type DoubleParamNonAutoRouterRoutes =
  inferRouterRoutes<DoubleParamNonAutoRouter>;
type DoubleParamAutoRouterRoutes = inferRouterRoutes<DoubleParamAutoRouter>;

const testRouter = dredgeRouter([
  singleParamNonAutoRouter,
  singleParamAutoRouter,
  doubleParamNonAutoRouter,
  doubleParamAutoRouter,
]);

type TestRouter = typeof testRouter;
type Routes = inferRouterRoutes<TestRouter>;

test("autocompletable paths", () => {
  type Path = inferRouteFirstPath<Routes[number]>;

  type SingleParamNonAutoPath =
    | `/a/b/c/d`
    | `:/:a/b/c/d`
    | `:/a/:b/c/d`
    | `:/a/b/:c/d`
    | `:/a/b/c/:d`;

  type SingleParamAutoPath =
    | "/e/f/g/h"
    | ":/:e/f/g/h"
    | ":/e/:f/g/h"
    | ":/e/f/:g/h"
    | ":/e/f/g/:h"
    | "/a/f/g/h"
    | "/b/f/g/h"
    | "/e/true/g/h"
    | "/e/false/g/h"
    | "/e/f/undefined/h"
    | "/e/f/g/null";

  type SingleParamPath = SingleParamNonAutoPath | SingleParamAutoPath;

  type DoubleParamNonAutoPath =
    | "/s/t/u/v/w/x"
    | ":/:s/t/:u/v/w/x"
    | ":/s/:t/u/:v/w/x"
    | ":/s/t/u/v/:w/:x";

  type DoubleParamAutoPath =
    | "/p/q/r/s/t/u"
    | ":/:p/q/:r/s/t/u"
    | ":/p/:q/r/:s/t/u"
    | ":/p/q/r/s/:t/:u"
    | "/a/q/true/s/t/u"
    | "/a/q/false/s/t/u"
    | "/b/q/true/s/t/u"
    | "/b/q/false/s/t/u"
    | "/p/true/r/undefined/t/u"
    | "/p/false/r/undefined/t/u"
    | "/p/q/r/s/undefined/null";

  type DoubleParamPath = DoubleParamNonAutoPath | DoubleParamAutoPath;

  type AllPath = SingleParamPath | DoubleParamPath;

  expectTypeOf<
    inferRouteFirstPath<SingleParamNonAutoRouterRoutes[number]>
  >().toEqualTypeOf<SingleParamNonAutoPath>();

  expectTypeOf<
    inferRouteFirstPath<SingleParamAutoRouterRoutes[number]>
  >().toEqualTypeOf<SingleParamAutoPath>();

  expectTypeOf<
    inferRouteFirstPath<DoubleParamNonAutoRouterRoutes[number]>
  >().toEqualTypeOf<DoubleParamNonAutoPath>();

  expectTypeOf<
    inferRouteFirstPath<DoubleParamAutoRouterRoutes[number]>
  >().toEqualTypeOf<DoubleParamAutoPath>();

  expectTypeOf<inferRouteFirstPath<Routes[number]>>().toEqualTypeOf<AllPath>();
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
