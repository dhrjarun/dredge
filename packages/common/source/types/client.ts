import { RequiredKeys } from "ts-essentials";
import { Parser, inferParserType } from "../parser";
import { Transformer } from "../transformer";
import { DredgeResponsePromise, HTTPMethod } from "./http";
import {
  AnyRoute,
  ExtractRoute,
  Route,
  inferPathType,
  inferRouteMethod,
  inferRoutePath,
  inferSearchParamsType,
} from "./route";
import { Simplify } from "./utils";

export type inferFetchOptions<R> = R extends Route<
  any,
  infer Method,
  infer Path,
  any,
  infer SearchParams extends Record<string, Parser>,
  infer IBody,
  any
>
  ? Omit<RequestInit, "body" | "headers" | "method"> & {
      headers?: Record<string, string>;
      method: Method;
      path: inferPathType<Path, SearchParams>;
    } & ([Method] extends ["post" | "put" | "patch"]
        ? { data: inferParserType<IBody> }
        : {}) &
      (keyof SearchParams extends never
        ? {}
        : { searchParams: inferSearchParamsType<SearchParams> })
  : never;

export type FetchOptions = {
  // headers?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string>;
  method: HTTPMethod | string;
  path: string;
  data?: any;
  searchParams?: Record<string, any>;
  transformer?: Partial<Transformer>;
  prefixUrl?: URL | string;
  fetch?: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>;
} & Omit<RequestInit, "body" | "headers" | "method">;

export type inferResponsePromise<R> = R extends Route<
  any,
  any,
  any,
  any,
  any,
  any,
  infer OBody
>
  ? DredgeResponsePromise<
      OBody extends Parser ? inferParserType<OBody> : unknown
    >
  : never;

type _FetchShortcutFunction<
  Routes extends AnyRoute[],
  Method extends HTTPMethod,
> = <
  P extends inferRoutePath<ExtractRoute<Routes[number], Method>>,
  R extends ExtractRoute<Routes[number], Method, P>,
>(
  path: P,
  options: Simplify<Omit<inferFetchOptions<R>, "method" | "path">>,
) => inferResponsePromise<R>;

type FetchShortcutFunction<
  Routes extends AnyRoute[],
  Method extends HTTPMethod,
> = <
  P extends inferRoutePath<ExtractRoute<Routes[number], Method>>,
  R extends ExtractRoute<Routes[number], Method, P>,
>(
  ...args: RequiredKeys<
    Omit<inferFetchOptions<R>, "method" | "path">
  > extends never
    ? [
        path: P,
        options?: Simplify<Omit<inferFetchOptions<R>, "method" | "path">>,
      ]
    : [
        path: P,
        options: Simplify<Omit<inferFetchOptions<R>, "method" | "path">>,
      ]
) => inferResponsePromise<R>;

export interface DredgeClient<Routes extends AnyRoute[]> {
  <
    P extends inferRoutePath<Routes[number]>,
    M extends inferRouteMethod<ExtractRoute<Routes[number], any, P>>,
    R extends ExtractRoute<Routes[number], M, P>,
  >(
    path: P,
    options: Simplify<
      { method: M } & Omit<inferFetchOptions<R>, "path" | "method">
    >,
  ): inferResponsePromise<R>;

  get: FetchShortcutFunction<Routes, "get">;
  post: FetchShortcutFunction<Routes, "post">;
  put: FetchShortcutFunction<Routes, "put">;
  delete: FetchShortcutFunction<Routes, "delete">;
  patch: FetchShortcutFunction<Routes, "patch">;
  head: FetchShortcutFunction<Routes, "head">;
}
