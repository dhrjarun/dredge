import {
  HTTPMethod,
  Parser,
  RequiredKeys,
  inferParserType,
} from "@dredge/common";
import {
  AnyRoute,
  ExtractRoute,
  Route,
  Simplify,
  inferPathType,
  inferRouteMethod,
  inferRoutePath,
  inferSearchParamsType,
} from "@dredge/common";
import { DefaultFetchOptions, FetchOptions } from "./options";
import { DredgeResponsePromise } from "./response";

// export type inferFetchOptions<R> = R extends Route<
//   any,
//   any,
//   any,
//   infer Method,
//   infer Path,
//   any,
//   infer SearchParams extends Record<string, Parser>,
//   infer IBody,
//   any,
//   any
// >
//   ? Omit<RequestInit, "body" | "headers" | "method"> & {
//       headers?: Record<string, string>;
//       method: Method;
//       path: inferPathType<Path, SearchParams>;
//     } & ([Method] extends ["post" | "put" | "patch"]
//         ? { data: inferParserType<IBody> }
//         : {}) &
//       (keyof SearchParams extends never
//         ? {}
//         : { searchParams: inferSearchParamsType<SearchParams> })
//   : never;

type inferFetchOptions<R, DataTypes extends string[] = []> = R extends Route<
  any,
  any,
  any,
  infer Method,
  infer Path,
  any,
  infer SearchParams extends Record<string, Parser>,
  infer IBody,
  any,
  any
>
  ? Omit<FetchOptions, "method" | "searchParams" | "data" | "dataTypes"> & {
      dataTypes: DataTypes;
      method: Method;
    } & ([Method] extends ["post" | "put" | "patch"]
        ? Data<DataTypes, inferParserType<IBody>>
        : {}) &
      (keyof SearchParams extends never
        ? {}
        : { searchParams: inferSearchParamsType<SearchParams> })
  : never;

type DistributiveOmit<T, K extends string | number | symbol> = T extends any
  ? Omit<T, K>
  : never;

type Data<Types, T> =
  | { data: T }
  | (Types extends string[]
      ? Types[number] extends infer U
        ? U extends string
          ? { [P in U]?: T }
          : never
        : never
      : never);

export type inferResponsePromise<
  R,
  DataTypes extends string[],
> = R extends Route<any, any, any, any, any, any, any, any, any, infer OBody>
  ? DredgeResponsePromise<
      DataTypes,
      OBody extends Parser ? inferParserType<OBody> : unknown
    >
  : never;

type FetchShortcutFunction<
  Routes extends AnyRoute[],
  Method extends HTTPMethod,
  DataTypes extends string[] = [],
> = <
  P extends inferRoutePath<ExtractRoute<Routes[number], Method>>,
  R extends ExtractRoute<Routes[number], Method, P>,
>(
  ...args: RequiredKeys<Omit<inferFetchOptions<R>, "method">> extends never
    ? [
        path: P,
        options?: Simplify<
          DistributiveOmit<inferFetchOptions<R>, "method" | "path">
        >,
      ]
    : [
        path: P,
        options: Simplify<
          DistributiveOmit<inferFetchOptions<R>, "method" | "path">
        >,
      ]
) => inferResponsePromise<R, DataTypes>;

export interface DredgeClient<
  Routes extends AnyRoute[],
  DataTypes extends string[] = [],
> {
  <
    P extends inferRoutePath<Routes[number]>,
    M extends inferRouteMethod<ExtractRoute<Routes[number], any, P>>,
    R extends ExtractRoute<Routes[number], M, P>,
  >(
    path: P,
    options: Simplify<
      { method: M } & DistributiveOmit<
        inferFetchOptions<R, DataTypes>,
        "path" | "method"
      >
    >,
  ): inferResponsePromise<R, DataTypes>;

  get: FetchShortcutFunction<Routes, "get", DataTypes>;
  post: FetchShortcutFunction<Routes, "post", DataTypes>;
  put: FetchShortcutFunction<Routes, "put", DataTypes>;
  delete: FetchShortcutFunction<Routes, "delete", DataTypes>;
  patch: FetchShortcutFunction<Routes, "patch", DataTypes>;
  head: FetchShortcutFunction<Routes, "head", DataTypes>;

  extends<DataTypes extends string[] = []>(
    options: Omit<DefaultFetchOptions, "dataTypes"> & {
      dataTypes: DataTypes;
    },
  ): DredgeClient<Routes, DataTypes>;
}
