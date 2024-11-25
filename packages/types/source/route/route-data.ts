import { Parser, inferParserType } from "../parser";
import { Route } from "./dredge-route";
import { IsNever } from "../utils";

type RequireOne<T, K extends keyof T = keyof T> = K extends keyof T
  ? Required<Pick<T, K>> & Partial<Omit<T, K>>
  : never;

export type Data<Types, T> = IsNever<T> extends false
  ? undefined extends T
    ? OptionalData<Types, T>
    : RequireOne<OptionalData<Types, T>>
  : OptionalData<Types, any>;

export type OptionalData<Types, T> = [Types] extends [string]
  ? {
      [P in Types | "data"]?: T;
    }
  : never;

export type inferRouteEData<R> = R extends Route<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  infer EData extends Parser
>
  ? inferParserType<EData>
  : R extends Route<
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        infer EData extends Parser
      >
    ? inferParserType<EData>
    : never;

export type inferRouteOData<R> = R extends Route<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  infer OData extends Parser,
  any
>
  ? inferParserType<OData>
  : R extends Route<
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        any,
        infer OData extends Parser,
        any
      >
    ? inferParserType<OData>
    : never;
