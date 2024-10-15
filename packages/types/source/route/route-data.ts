import { Parser, inferParserType } from "../parser";
import { Route } from "./dredge-route";

// type OptionalData<Types, T> = { data?: T } & (IsNever<Types> extends false
//   ? Types extends string
//     ? {
//         [P in Types]?: T;
//       }
//     : {}
//   : {});

export type Data<Types, T> = undefined extends T
  ? OptionalData<Types, T>
  : RequiredData<Types, T>;

export type RequiredData<Types, T> =
  | { data: T }
  | (Types extends infer U
      ? U extends string
        ? { [P in U]: T }
        : never
      : never);

export type OptionalData<Types, T> =
  | { data?: T }
  | (Types extends infer U
      ? U extends string
        ? { [P in U]?: T }
        : never
      : never);

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
