import { IsAny } from "ts-essentials";
import { Parser, ParserWithoutInput, inferParserType } from "../parser";
import { HTTPMethod } from "./http";
import { MaybePromise, Overwrite, Simplify } from "./utils";

export interface MiddlewareResult<C> {
  ctx: C;
}

export type inferSearchParamsType<SearchParams> = Simplify<{
  [key in keyof SearchParams]: inferParserType<SearchParams[key]>;
}>;

export type MiddlewareFunction<
  Context,
  ContextOverride,
  Paths,
  Params,
  SearchParams,
  Method,
  IBody,
  OBody,
> = {
  (
    req: Req<Method, Paths, Params, SearchParams, IBody>,
    res: Omit<Res<Context, OBody>, "send">,
  ): MaybePromise<MiddlewareResult<ContextOverride>>;
};

export interface ResolverOptions {
  ctx?: object;
  method?: HTTPMethod | string;
  data?: any;
  path: string;
  headers?: Record<string, string | string[] | undefined>;
  searchParams?: Record<string, any>;
}

export interface ResolverResult<Data> {
  data: () => Promise<Data>;
  ok: boolean;
  headers: Record<string, string>;
  status: number;
  statusText: string;
}

export type ResolverResultPromise<T = any> = {
  data(): Promise<T>;
} & Promise<ResolverResult<T>>;

export type inferResolverOption<R> = R extends Route<
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
        : { searchParams: inferSearchParamsType<SearchParams> })
  : never;

// export type isAnyRoute<R> = R extends Route<
//   any,
//   infer _Method extends number,
//   infer _Path extends number,
//   any,
//   infer _SearParams extends number,
//   infer _IBody extends number,
//   any
// >
//   ? true
//   : false;

export type isAnyRoute<R> = R extends Route<
  infer Context,
  infer Method,
  infer Paths,
  infer Params,
  infer SearchParams,
  infer IBody,
  infer OBody
>
  ?
      | IsAny<Context>
      | IsAny<Method>
      | IsAny<Paths>
      | IsAny<Params>
      | IsAny<SearchParams>
      | IsAny<IBody>
      | IsAny<OBody> extends true
    ? true
    : false
  : false;

export type inferResolverResult<R> = R extends Route<
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

export type inferResolverResultPromise<R> = R extends Route<
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

export type ErrorResolverFunction = {
  (
    errorInfo: {
      errorOrigin: string;
      error: unknown;
    },
    req: Req<string, string[], any, any, any>,
    res: Omit<Res<any, any, "error">, "next">,
  ): MaybePromise<ResolverResult<unknown>>;
};

export type ResolverFunction<
  Context,
  Method,
  Paths,
  Params,
  SearchParams,
  IBody,
  OBody,
  OData,
> = {
  (
    req: Req<Method, Paths, Params, SearchParams, IBody>,
    res: Omit<Res<Context, OBody>, "next">,
  ): MaybePromise<ResolverResult<OData>>;
  _type?: string | undefined;
};

type Req<Method, _Paths, Params, SearchParams, IBody> = {
  readonly method: Method;
  readonly path: string;

  readonly params: {
    [key in keyof Params]: Params[key] extends null
      ? string
      : inferParserType<Params[key]>;
  };
  readonly searchParams: {
    [key in keyof SearchParams]: inferParserType<SearchParams[key]>;
  };
  readonly headers: Record<string, string | string[] | undefined>;

  readonly data: IBody extends null ? never : inferParserType<IBody>;
};

type Res<Context, OBody, type extends "error" | "success" = "success"> = {
  readonly ctx: Context;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly status?: number;
  readonly statusText?: string;
  readonly data: OBody extends null ? never : inferParserType<OBody>;
  send: type extends "success"
    ? {
        (): ResolverResult<unknown>;
        <T>(opts: {
          data?: T;
          headers?: Record<string, string>;
          status?: number;
          statusText?: string;
        }): ResolverResult<T>;
      }
    : {
        (): ResolverResult<unknown>;
        (opts: {
          error?: any;
          headers?: Record<string, string>;
          status?: number;
          statusText?: string;
        }): ResolverResult<unknown>;
      };

  next: {
    (): MiddlewareResult<Context>;
    <$ContextOverride>(opts: {
      ctx?: $ContextOverride;
      headers?: Record<string, string>;
      status?: number;
      statusText?: number;
    }): MiddlewareResult<$ContextOverride>;
  };
};

export type RouteBuilderDef<isResolved extends boolean = boolean> = {
  isResolved: isResolved;
  method: HTTPMethod;
  paths: string[];
  params: Record<string, Parser>;
  searchParams: Record<string, Parser>;

  iBody?: Parser;
  oBody?: Parser;

  middlewares: MiddlewareFunction<any, any, any, any, any, any, any, any>[];
  errorResolver: ErrorResolverFunction;
  resolver?: ResolverFunction<any, any, any, any, any, any, any, any>;
};

export interface Route<
  Context,
  Method,
  Paths,
  Params,
  SearchParams,
  IBody,
  OBody,
> {
  _def: RouteBuilderDef<true>;
}

// TODO
// IBody and OBody default type
// OBody Schema implementation
// after middleware
export interface UnresolvedRoute<
  Context,
  Method,
  // Paths extends Array<string> = [],
  Paths = [],
  Params = {},
  SearchParams = {},
  IBody = null,
  OBody = null,
> {
  _def: RouteBuilderDef<false>;

  error(
    fn: ErrorResolverFunction,
  ): UnresolvedRoute<Context, Method, Paths, SearchParams, IBody, OBody>;

  path<const T extends string[]>(
    ...paths: T
  ): UnresolvedRoute<
    Context,
    Method,
    Paths extends Array<string> ? [...Paths, ...T] : T,
    Params & {
      [key in T[number] as key extends `:${infer N}` ? N : never]: null;
    },
    SearchParams,
    IBody,
    OBody
  >;

  params<
    const T extends {
      [key in keyof Params as Params[key] extends null ? key : never]?: Parser;
    },
  >(
    arg: T,
  ): UnresolvedRoute<
    Context,
    Method,
    Paths,
    Overwrite<Params, T>,
    SearchParams,
    IBody,
    OBody
  >;

  searchParam<const T extends { [key: string]: Parser }>(
    queries: T,
  ): UnresolvedRoute<Context, Method, Paths, Params, T, IBody>;

  use<ContextOverride>(
    fn: MiddlewareFunction<
      Context,
      ContextOverride,
      Paths,
      Params,
      SearchParams,
      Method,
      IBody,
      OBody
    >,
  ): UnresolvedRoute<
    Overwrite<Context, ContextOverride>,
    Method,
    Paths,
    Params,
    SearchParams,
    IBody
  >;

  resolve<T>(
    fn: ResolverFunction<
      Context,
      Method,
      Paths,
      Params,
      SearchParams,
      IBody,
      OBody,
      T
    >,
  ): Route<
    Context,
    Method,
    Paths,
    Params,
    SearchParams,
    IBody,
    ParserWithoutInput<T>
  >;

  method<M extends HTTPMethod, P extends Parser>(
    method: M,
    parser?: P,
  ): UnresolvedRoute<Context, M, Paths, Params, SearchParams, P, OBody>;
  get(): UnresolvedRoute<
    Context,
    "get",
    Paths,
    Params,
    SearchParams,
    IBody,
    OBody
  >;
  post<P extends Parser>(
    parser: P,
  ): UnresolvedRoute<Context, "post", Paths, Params, SearchParams, P, OBody>;
  put<P extends Parser>(
    parser: P,
  ): UnresolvedRoute<Context, "put", Paths, Params, SearchParams, P, OBody>;
  delete(): UnresolvedRoute<
    Context,
    "delete",
    Paths,
    Params,
    SearchParams,
    IBody,
    OBody
  >;
  patch<P extends Parser>(
    parser: P,
  ): UnresolvedRoute<Context, "patch", Paths, Params, SearchParams, P, OBody>;
  head(): UnresolvedRoute<
    Context,
    "head",
    Paths,
    Params,
    SearchParams,
    IBody,
    OBody
  >;
}

export type AnyRoute = Route<any, any, any, any, any, any, any>;
export type AnyUnresolvedRoute = UnresolvedRoute<
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;

// TODO: Fix when given other types
type _inferPathType<
  Paths,
  Params extends Record<string, Parser>,
> = Paths extends [infer First extends string, ...infer Tail extends string[]]
  ? `/${First extends `:${infer N}`
      ? Params[N] extends Parser
        ? inferParserType<Params[N]>
        : string
      : First}${_inferPathType<Tail, Params>}`
  : "";
export type inferPathType<
  Paths,
  Params extends Record<string, Parser>,
> = Paths extends string[] ? _inferPathType<Paths, Params> : string;

export type inferRoutePath<R> = R extends Route<
  any,
  any,
  infer Path,
  infer Params extends Record<string, Parser>,
  any,
  any,
  any
>
  ? inferPathType<Path, Params>
  : never;

export type ExtractRoute<
  R,
  Method extends HTTPMethod,
  Path extends string = any,
> = R extends Route<
  any,
  infer M,
  infer PathArray,
  infer Params extends Record<string, Parser>,
  any,
  any,
  any
>
  ? [Method, Path] extends [M, inferPathType<PathArray, Params>]
    ? R
    : never
  : never;

export type inferRouteMethod<R> = R extends Route<
  any,
  infer Method extends HTTPMethod,
  any,
  any,
  any,
  any,
  any
>
  ? Method
  : never;
