import {
  AnyRoute,
  ExcludeRoute,
  HasRouteParamPath,
  Route,
  inferRouteGenericPath,
  inferRouteSimplePath,
} from "./route";
import { IsNever, Merge } from "./utils";

export interface DredgeRouter<Routes = []> {
  find(method: string, path: string[]): AnyRoute | null;
}

export type inferRouterRoutes<T> = T extends DredgeRouter<infer R> ? R : never;

export type _OverwriteRoutes<
  T extends (AnyRoute | DredgeRouter)[],
  U extends AnyRoute[] = [],
> = T extends [infer First, ...infer Rest extends (AnyRoute | DredgeRouter)[]]
  ? First extends DredgeRouter<infer Rs extends AnyRoute[]>
    ? _OverwriteRoutes<Rest, [...U, ...Rs]>
    : _OverwriteRoutes<Rest, [...U, First extends AnyRoute ? First : never]>
  : U;

export type OverwriteRoutes<
  T extends (AnyRoute | DredgeRouter)[],
  U extends AnyRoute[] = [],
> = ModifyRoutes<_OverwriteRoutes<T, U>>;

// export type ModifyRoutes<
//   T extends AnyRoute[],
//   All extends AnyRoute[] = T,
//   U extends any[] = [],
// > = T extends [infer First extends AnyRoute, ...infer Rest extends AnyRoute[]]
//   ? HasRouteParamPath<First> extends false
//     ? ModifyRoutes<Rest, All, [...U, First]>
//     : IsNever<
//           Extract<
//             inferRouteSimplePath<ExcludeRoute<All[number], First>>,
//             inferRouteSimplePath<First>
//           >
//         > extends true
//       ? ModifyRoutes<Rest, All, [...U, First]>
//       : ModifyRoutes<Rest, All, [...U, MakeDynamicRoute<First>]>
//   : U;

export type ModifyRoutes<
  T extends AnyRoute[],
  All extends AnyRoute[] = T,
  U extends any[] = [],
> = T extends [infer First extends AnyRoute, ...infer Rest extends AnyRoute[]]
  ? HasRouteParamPath<First> extends false
    ? ModifyRoutes<Rest, All, [...U, First]>
    : IsNever<
          Extract<inferRouteGenericPath<First>, inferRouteSimplePath<First>>
        > extends false
      ? ModifyRoutes<Rest, All, [...U, MakeDynamicRoute<First>]>
      : ModifyRoutes<Rest, All, [...U, First]>
  : U;

type MakeDynamicRoute<T> = T extends Route<
  infer Options,
  infer SuccessContext,
  infer ErrorContext,
  infer Method,
  infer Paths,
  infer Params,
  infer SearchParams,
  infer IBody,
  infer OBody,
  infer EBody
>
  ? Route<
      Merge<
        Options,
        {
          withDynamicPath: true;
        }
      >,
      SuccessContext,
      ErrorContext,
      Method,
      Paths,
      Params,
      SearchParams,
      IBody,
      OBody,
      EBody
    >
  : never;
