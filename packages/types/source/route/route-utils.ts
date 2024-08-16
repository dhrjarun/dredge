import { Parser } from "../parser";
import { AnyRouteOptions, Route } from "./dredge-route";
import { HTTPMethod } from "./http";
import {
  inferParamPathString,
  inferPathString,
  inferRouteSignature,
  inferSimplePathString,
} from "./route-path";

export type ExtractRouteBy<
  R,
  Method extends HTTPMethod,
  Path extends string = any,
> = R extends Route<
  any,
  any,
  any,
  infer M,
  infer PathArray,
  infer Params extends Record<string, Parser>,
  any,
  any,
  any,
  any
>
  ? Method extends M
    ? Path extends inferPathString<PathArray, Params>
      ? R
      : never
    : never
  : never;

export type ExtractFirstRouteBy<
  R,
  Method extends HTTPMethod,
  Path extends string = any,
> = R extends Route<
  // infer Options extends AnyRouteOptions, // This is not working, if RouteOption only has withDynamicPath
  infer Options extends {
    withDynamicPath: boolean;
  },
  any,
  any,
  infer M,
  infer PathArray,
  infer Params extends Record<string, Parser>,
  any,
  any,
  any,
  any
>
  ? Method extends M
    ? Path extends (
        Options["withDynamicPath"] extends true
          ? inferParamPathString<PathArray>
          : inferPathString<PathArray, Params>
      )
      ? R
      : never
    : never
  : never;

export type ExtractSecondRouteBy<R, Method, Path> = R extends Route<
  infer Options extends {
    withDynamicPath: boolean;
  },
  any,
  any,
  infer M,
  infer PathArray,
  infer Params extends Record<string, Parser>,
  any,
  null,
  any,
  any
>
  ? Method extends M
    ? Path extends (
        Options["withDynamicPath"] extends true
          ? inferSimplePathString<PathArray, Params>
          : never
      )
      ? R
      : never
    : never
  : never;

export type ExcludeRoute<T, U> = T extends Route<
  any,
  any,
  any,
  infer M,
  infer PA extends string[],
  any,
  any,
  null,
  any,
  any
>
  ? [M, ...PA] extends inferRouteSignature<U>
    ? never
    : T
  : never;

//This is the same as above, but it does not work
// export type ExcludeRoute<T, U> =
//   inferRouteSignature<T> extends inferRouteSignature<U> ? never : T;

export type ExtractRoute<T, U> = T extends Route<
  any,
  any,
  any,
  infer M,
  infer PA extends string[],
  any,
  any,
  null,
  any,
  any
>
  ? [M, ...PA] extends inferRouteSignature<U>
    ? T
    : never
  : never;
