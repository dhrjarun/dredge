import {
  AnyValidRoute,
  HasRouteParamPath,
  Route,
  inferRouteGenericPath,
  inferRouteSimplePath,
} from "./route";
import { IsNever, Merge } from "./utils";

export interface DredgeRouter<Routes = []> {
  find(method: string, path: string[]): AnyValidRoute | null;
}

export type inferRouterRoutes<T> = T extends DredgeRouter<infer R> ? R : never;

export type _OverwriteRoutes<
  T extends (AnyValidRoute | DredgeRouter)[],
  U extends AnyValidRoute[] = [],
> = T extends [
  infer First,
  ...infer Rest extends (AnyValidRoute | DredgeRouter)[],
]
  ? First extends DredgeRouter<infer Rs extends AnyValidRoute[]>
    ? _OverwriteRoutes<Rest, [...U, ...Rs]>
    : _OverwriteRoutes<
        Rest,
        [...U, First extends AnyValidRoute ? First : never]
      >
  : U;

export type OverwriteRoutes<
  T extends (AnyValidRoute | DredgeRouter)[],
  U extends AnyValidRoute[] = [],
> = ModifyRoutes<_OverwriteRoutes<T, U>>;

export type ModifyRoutes<
  T extends AnyValidRoute[],
  All extends AnyValidRoute[] = T,
  U extends any[] = [],
> = T extends [
  infer First extends AnyValidRoute,
  ...infer Rest extends AnyValidRoute[],
]
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
