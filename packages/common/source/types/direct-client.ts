import { IsNever } from "ts-essentials";
import { Parser, inferParserType } from "../parser";
import { HTTPMethod } from "./http";
import {
  AnyRoute,
  AnyRouteOptions,
  ExtractRoute,
  Route,
  inferRouteMethod,
  inferRoutePath,
  inferSearchParamsType,
} from "./route";
import { RequiredKeys, Simplify } from "./utils";

type Context = Record<string, any>;

export interface DirectClientOptions {
  ctx?: Context;
  method?: HTTPMethod;
  data?: any;
  dataType?: string;
  responseDataType?: string;
  headers?: Record<string, string>;
  searchParams?: Record<string, any>;
  prefixUrl?: URL | string;
  throwHttpErrors?: boolean;
}

export type DefaultDirectClientOptions = Pick<
  DirectClientOptions,
  "ctx" | "headers" | "throwHttpErrors" | "prefixUrl"
>;

export interface DirectResponse<T = any> {
  headers: Record<string, string>;
  status: number;
  statusText: string;
  data(): Promise<T>;
}

export type DirectResponsePromise<
  DataTypes,
  Data = any,
> = Promise<DirectResponse> & {
  [key in DataTypes extends string ? DataTypes : never]: () => Promise<Data>;
} & { data: () => Promise<Data> };

type Data<Types, T> =
  | { data: T }
  | (Types extends infer U
      ? U extends string
        ? { [P in U]: T }
        : never
      : never);

type inferDirectClientOption<R> = R extends Route<
  infer Options extends AnyRouteOptions,
  any,
  any,
  infer Method,
  any,
  any,
  infer SearchParams,
  infer IBody,
  any,
  any
>
  ? Omit<
      DirectClientOptions,
      "method" | "searchParams" | "data" | "ctx" | "dataType"
    > & {
      method: Method;
      ctx?: Options["modifiedInitialContext"];
      dataType?: keyof Options["dataTypes"];
    } & ([Method] extends ["post" | "put" | "patch"]
        ? IBody extends Parser
          ? Data<keyof Options["dataTypes"], inferParserType<IBody>>
          : {}
        : {}) &
      (IsNever<keyof SearchParams> extends true
        ? {}
        : { searchParams: inferSearchParamsType<SearchParams> })
  : DirectClientOptions;

type _inferDirectClientOption<R> = IsNever<R> extends true
  ? DirectClientOptions
  : inferDirectClientOption<R>;

type inferDirectResponsePromise<R> = R extends Route<
  infer Options extends AnyRouteOptions,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  infer OBody,
  any
>
  ? DirectResponsePromise<
      keyof Options["dataTypes"],
      OBody extends Parser ? inferParserType<OBody> : unknown
    >
  : never;

type ResolveRouteShortcutFunction<
  Routes extends AnyRoute[],
  Method extends HTTPMethod,
> = {
  <
    P extends inferRoutePath<ExtractRoute<Routes[number], Method>>,
    R extends ExtractRoute<Routes[number], Method, P>,
  >(
    ...args: RequiredKeys<
      Omit<inferDirectClientOption<R>, "method">
    > extends never
      ? [
          path: P,
          options?: Simplify<
            DistributiveOmit<_inferDirectClientOption<R>, "method">
          >,
        ]
      : [
          path: IsNever<P> extends true ? string : P,
          options: Simplify<
            DistributiveOmit<_inferDirectClientOption<R>, "method">
          >,
        ]
  ): inferDirectResponsePromise<R>;
};

type DistributiveOmit<T, K extends string | number | symbol> = T extends any
  ? Omit<T, K>
  : never;

// export interface DirectClient<Routes extends AnyRoute[]> {
//   <
//     P extends inferRoutePath<Routes[number]>,
//     M extends inferRouteMethod<ExtractRoute<Routes[number], any, P>>,
//     R extends ExtractRoute<Routes[number], M, P>,
//   >(
//     path: P,
//     options: Simplify<
//       { method: M } & DistributiveOmit<inferDirectClientOption<R>, "method">
//     >,
//   ): inferDirectResponsePromise<R>;

//   get: ResolveRouteShortcutFunction<Routes, "get">;
//   post: ResolveRouteShortcutFunction<Routes, "post">;
//   put: ResolveRouteShortcutFunction<Routes, "put">;
//   delete: ResolveRouteShortcutFunction<Routes, "delete">;
//   patch: ResolveRouteShortcutFunction<Routes, "patch">;
//   head: ResolveRouteShortcutFunction<Routes, "head">;
// }

export type DirectClient<Routes extends AnyRoute[]> = {
  <
    P extends inferRoutePath<Routes[number]>,
    M extends inferRouteMethod<ExtractRoute<Routes[number], any, P>>,
    R extends ExtractRoute<Routes[number], M, P>,
  >(
    path: P,
    options: Simplify<
      { method: M } & DistributiveOmit<inferDirectClientOption<R>, "method">
    >,
  ): inferDirectResponsePromise<R>;

  extends(defaultOptions: DefaultDirectClientOptions): DirectClient<Routes>;
} & Pick<MethodClient<Routes>, inferRouteMethod<Routes[number]>>;

interface MethodClient<Routes extends AnyRoute[]> {
  get: ResolveRouteShortcutFunction<Routes, "get">;
  post: ResolveRouteShortcutFunction<Routes, "post">;
  put: ResolveRouteShortcutFunction<Routes, "put">;
  delete: ResolveRouteShortcutFunction<Routes, "delete">;
  patch: ResolveRouteShortcutFunction<Routes, "patch">;
  head: ResolveRouteShortcutFunction<Routes, "head">;
}
