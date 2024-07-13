import { Route } from "@dredge/common";
import { Parser, inferParserType } from "../parser";

type _inferSimplePathString<
  Paths,
  Params extends Record<string, Parser>,
> = Paths extends [infer First extends string, ...infer Tail extends string[]]
  ? `/${First extends `:${infer N}`
      ? Params[N] extends Parser
        ? inferParserType<Params[N]>
        : string
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

export type inferParamPathString<Paths> = Paths extends []
  ? never
  : Paths extends string[]
    ? `:${_inferParamPathString<Paths>}`
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
