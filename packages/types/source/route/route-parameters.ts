import { inferParserType } from "../parser";
import { IsNever, MarkOptionalToUndefined, Simplify } from "../utils";

export type inferQueriesType<Queries> = Simplify<
  MarkOptionalToUndefined<{
    [key in keyof Queries]:
      | inferParserType<Queries[key]>
      | inferParserType<Queries[key]>[];
  }>
>;

export type inferClientParamsType<Params, Type = ":" | "?"> =
  | ":"
  | "?" extends Type
  ? Simplify<
      inferQueryClientParamsType<Params> & inferColonClientParamsType<Params>
    >
  : Type extends "?"
    ? inferQueryClientParamsType<Params>
    : inferColonClientParamsType<Params>;

export type inferColonClientParamsType<Params> = Simplify<{
  [key in keyof Params as key extends `:${infer N}` ? N : never]: IsNever<
    Params[key]
  > extends true
    ? any
    : inferParserType<Params[key]>;
}>;

export type inferQueryClientParamsType<Params> = Simplify<{
  [key in keyof Params as key extends `?${infer N}` ? N : never]: IsNever<
    Params[key]
  > extends true
    ? any | any[]
    : inferParserType<Params[key]> | inferParserType<Params[key]>[];
}>;

export type inferParamsType<
  Params,
  Type extends ":" | "?" = ":" | "?",
> = Simplify<{
  [key in keyof Params as key extends `${Type}${infer N}` ? N : never]: IsNever<
    Params[key]
  > extends true
    ? any
    : inferParserType<Params[key]>;
}>;
