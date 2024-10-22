import { inferParserType } from "../parser";
import { IsNever, MarkOptionalToUndefined, Simplify } from "../utils";

export type inferQueriesType<Queries> = Simplify<
  MarkOptionalToUndefined<{
    [key in keyof Queries]:
      | inferParserType<Queries[key]>
      | inferParserType<Queries[key]>[];
  }>
>;

export type inferParamsType<Params> = Simplify<{
  [key in keyof Params]: IsNever<Params[key]> extends true
    ? string
    : inferParserType<Params[key]>;
}>;
