import { Parser } from "../parser";
import { Route } from "./dredge-route";
import { HTTPMethod } from "./http";
import { inferPathString } from "./route-path";

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
