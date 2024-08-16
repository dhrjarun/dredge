import { IsNever } from "ts-essentials";
import { Parser, inferParserType } from "../parser";
import { Route } from "./dredge-route.js";

type inferParamParserType<P> = IsNever<P> extends true
  ? string
  : P extends Parser
    ? inferParserType<P>
    : string;

type _inferSimplePathString<
  Paths,
  Params extends Record<string, Parser>,
> = Paths extends [infer First extends string, ...infer Tail extends string[]]
  ? `/${First extends `:${infer N}`
      ? inferParamParserType<Params[N]>
      : First}${_inferSimplePathString<Tail, Params>}`
  : "";

export type inferSimplePathString<
  Paths,
  Params extends Record<string, Parser>,
> = Paths extends []
  ? never
  : Paths extends string[]
    ? _inferSimplePathString<Paths, Params>
    : never;

type _inferParamPathString<Paths> = Paths extends [
  infer First extends string,
  ...infer Tail extends string[],
]
  ? `/${First}${_inferParamPathString<Tail>}`
  : "";

export type inferParamPathString<Paths> = Paths extends string[]
  ? IsNever<Extract<Paths[number], `:${string}`>> extends true
    ? never
    : `:${_inferParamPathString<Paths>}`
  : never;

export type inferPathString<PathArray, Params extends Record<string, Parser>> =
  | inferSimplePathString<PathArray, Params>
  | inferParamPathString<PathArray>;

export type inferRoutePath<R> = R extends Route<
  any,
  any,
  any,
  any,
  infer PathArray,
  infer Params extends Record<string, Parser>,
  any,
  any,
  any,
  any
>
  ? inferPathString<PathArray, Params>
  : never;

export type inferRouteFirstPath<R> = R extends Route<
  infer Options extends {
    withDynamicPath: boolean;
  },
  any,
  any,
  any,
  infer PathArray,
  infer Params extends Record<string, Parser>,
  any,
  any,
  any,
  any
>
  ? Options["withDynamicPath"] extends false
    ? inferPathString<PathArray, Params>
    : inferParamPathString<PathArray>
  : never;

export type inferRouteSecondPath<R> = R extends Route<
  infer Options extends {
    withDynamicPath: boolean;
  },
  any,
  any,
  any,
  infer PathArray,
  infer Params extends Record<string, Parser>,
  any,
  any,
  any,
  any
>
  ? Options["withDynamicPath"] extends false
    ? never
    : inferSimplePathString<PathArray, Params>
  : never;

export type inferRouteSimplePath<R> = R extends Route<
  any,
  any,
  any,
  any,
  infer PathArray,
  infer Params extends Record<string, Parser>,
  any,
  any,
  any,
  any
>
  ? inferSimplePathString<PathArray, Params>
  : never;

export type inferRouteSignature<R> = R extends Route<
  any,
  any,
  any,
  infer Method,
  infer PathArray extends string[],
  any,
  any,
  any,
  any,
  any
>
  ? [Method, ...PathArray]
  : never;
