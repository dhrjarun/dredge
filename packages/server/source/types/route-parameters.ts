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
  [key in keyof Params]: inferParserType<Params[key]>;
}>;
