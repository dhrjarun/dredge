import { Route } from "@dredge/common";
import { Parser, inferParserType } from "../parser";
import { HTTPMethod } from "./http";
import { inferPathString } from "./route-path";
import { MarkOptionalToUndefined, Simplify } from "./utils";

export type ExtractRoute<
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

export type inferSearchParamsType<SearchParams> = Simplify<
  MarkOptionalToUndefined<{
    [key in keyof SearchParams]:
      | inferParserType<SearchParams[key]>
      | inferParserType<SearchParams[key]>[];
  }>
>;

export type inferParamsType<Params> = Simplify<{
  [key in keyof Params]: inferParserType<Params[key]>;
}>;
