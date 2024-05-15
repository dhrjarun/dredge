import { Parser, inferParserType } from "../parser";
import { HTTPMethod } from "./http";
import {
  AnyRoute,
  ExtractRoute,
  Route,
  inferPathType,
  inferRouteMethod,
  inferRoutePath,
  inferSearchParamsType,
} from "./route";
import { RequiredKeys, Simplify } from "./utils";

interface ResolverOptions {
  ctx?: object;
  method?: HTTPMethod | string;
  data?: any;
  path: string;
  headers?: Record<string, string | string[] | undefined>;
  searchParams?: Record<string, any>;
}

interface ResolverResult<Data> {
  data: Data;
  headers: Record<string, string>;
  status: number;
  statusText: string;
}

type ResolverResultPromise<T = any> = {
  data(): Promise<T>;
} & Promise<ResolverResult<T>>;

type inferResolverOption<R> = R extends Route<
  any,
  infer Context,
  any,
  infer Method,
  infer Path,
  any,
  infer SearchParams extends Record<string, Parser>,
  infer IBody,
  any
>
  ? {
      headers?: Record<string, string | string[] | undefined>;
      method: Method;
      path: inferPathType<Path, SearchParams>;
    } & ([Method] extends ["post" | "put" | "patch"]
      ? { data: inferParserType<IBody> }
      : {}) &
      (keyof SearchParams extends never
        ? {}
        : { searchParams: inferSearchParamsType<SearchParams> }) &
      (keyof Context extends never ? {} : { ctx: Context })
  : never;

type inferResolverResult<R> = R extends Route<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  infer OBody
>
  ? ResolverResult<OBody extends Parser ? inferParserType<OBody> : unknown>
  : never;

type inferResolverResultPromise<R> = R extends Route<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  infer OBody
>
  ? ResolverResultPromise<
      OBody extends Parser ? inferParserType<OBody> : unknown
    >
  : never;

type ResolveRouteShortcutFunction<
  Routes extends AnyRoute[],
  Method extends HTTPMethod,
> = <
  P extends inferRoutePath<ExtractRoute<Routes[number], Method>>,
  R extends ExtractRoute<Routes[number], Method, P>,
>(
  ...args: RequiredKeys<
    Omit<inferResolverOption<R>, "method" | "path">
  > extends never
    ? [
        path: P,
        options?: Simplify<Omit<inferResolverOption<R>, "method" | "path">>,
      ]
    : [
        path: P,
        options: Simplify<Omit<inferResolverOption<R>, "method" | "path">>,
      ]
) => inferResolverResultPromise<R>;

export interface DirectClient<Routes extends AnyRoute[]> {
  <
    P extends inferRoutePath<Routes[number]>,
    M extends inferRouteMethod<ExtractRoute<Routes[number], any, P>>,
    R extends ExtractRoute<Routes[number], M, P>,
  >(
    path: P,
    options: Simplify<
      { method: M } & Omit<inferResolverOption<R>, "path" | "method">
    >,
  ): inferResolverResultPromise<R>;

  get: ResolveRouteShortcutFunction<Routes, "get">;
  post: ResolveRouteShortcutFunction<Routes, "post">;
  put: ResolveRouteShortcutFunction<Routes, "put">;
  delete: ResolveRouteShortcutFunction<Routes, "delete">;
  patch: ResolveRouteShortcutFunction<Routes, "patch">;
  head: ResolveRouteShortcutFunction<Routes, "head">;
}
