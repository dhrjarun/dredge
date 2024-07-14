import { IsNever } from "ts-essentials";
import { inferParserType } from "../parser";
import { MarkOptionalToUndefined, Simplify } from "./utils";

export type inferSearchParamsType<SearchParams> = Simplify<
  MarkOptionalToUndefined<{
    [key in keyof SearchParams]:
      | inferParserType<SearchParams[key]>
      | inferParserType<SearchParams[key]>[];
  }>
>;

export type inferParamsType<Params> = Simplify<{
  [key in keyof Params]: IsNever<Params[key]> extends true
    ? string
    : inferParserType<Params[key]>;
}>;
