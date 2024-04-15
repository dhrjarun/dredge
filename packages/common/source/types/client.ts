import {
  inferPathType,
  inferSearchParamsType,
  Route,
  ExtractRoute,
  AnyRoute,
  inferRoutePath,
  inferRouteMethod,
} from "./route";
import { Parser, inferParserType } from "../parser";
import { Simplify } from "./utils";
import { HTTPMethod, DredgeResponsePromise } from "./http";
import { Transformer } from "../transformer";

export type inferFetchOptions<R> = R extends Route<
  any,
  infer Method,
  infer Path,
  any,
  infer SearchParams extends Record<string, Parser>,
  infer IBody
>
  ? FetchOptions & {
      method: Method;
      path: inferPathType<Path, SearchParams>;
    } & (Method extends "get" | "delete" | "head"
        ? {}
        : { data: inferParserType<IBody> }) &
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
    input: string | URL | globalThis.Request,
    init?: RequestInit
  ) => Promise<Response>;
};

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

type FetchShortcutFunction<
  Routes extends AnyRoute[],
  Method extends HTTPMethod
> = <
  P extends inferRoutePath<ExtractRoute<Routes[number], Method>>,
  R extends ExtractRoute<Routes[number], Method, P>
>(
  path: P,
  options: Simplify<Omit<inferFetchOptions<R>, "method" | "path">>
) => inferResponsePromise<R>;

export interface DredgeClient<Routes extends AnyRoute[]> {
  <
    P extends inferRoutePath<Routes[number]>,
    M extends inferRouteMethod<ExtractRoute<Routes[number], any, P>>,
    R extends ExtractRoute<Routes[number], M, P>
  >(
    path: P,
    options: Simplify<
      { method: M } & Omit<inferFetchOptions<R>, "path" | "method">
    >
  ): inferResponsePromise<R>;

  get: FetchShortcutFunction<Routes, "get">;
  post: FetchShortcutFunction<Routes, "post">;
  put: FetchShortcutFunction<Routes, "put">;
  delete: FetchShortcutFunction<Routes, "delete">;
  patch: FetchShortcutFunction<Routes, "patch">;
  head: FetchShortcutFunction<Routes, "head">;
}
