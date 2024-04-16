import { Parser, ParserWithoutInput, inferParserType } from "../parser";
import { MaybePromise, Overwrite, Simplify } from "./utils";
import { HTTPMethod } from "./http";

export interface MiddlewareResult<C> {
  ctx: C;
}

export type inferSearchParamsType<SearchParams> = Simplify<{
  [key in keyof SearchParams]: inferParserType<SearchParams[key]>;
}>;

export type MiddlewareFunction<
  Context,
  ContextOverride,
  _Paths,
  Params,
  SearchParams,
  Method,
  IBody
> = {
  (opts: {
    ctx: Context;
    path: string;
    params: {
      [key in keyof Params]: Params[key] extends null
        ? string
        : inferParserType<Params[key]>;
    };
    searchParams: {
      [key in keyof SearchParams]: inferParserType<SearchParams[key]>;
    };
    method: Method;
    data: inferParserType<IBody>;

    next: {
      (): MiddlewareResult<Context>;
      <$ContextOverride>(opts: {
        ctx: $ContextOverride;
      }): MiddlewareResult<$ContextOverride>;
    };
  }): MaybePromise<MiddlewareResult<ContextOverride>>;
};

export interface ResolverOptions {
  ctx?: object;
  method?: HTTPMethod | string;
  data?: any;
  path: string;
  // headers?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string>;
  searchParams?: Record<string, any>;
}

export interface ResolverResult<Data> {
  data: () => Promise<Data>;
  ok: boolean;
  headers: Record<string, string>;
  status: number;
  statusText: string;
}

type _inferResolverOption<R> = R extends Route<
  any,
  infer Method,
  infer Path,
  any,
  infer SearchParams extends Record<string, Parser>,
  infer IBody
>
  ? {
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

export type inferResolverOption<R> = isAnyRoute<R> extends true
  ? ResolverOptions
  : _inferResolverOption<R>;

export type isAnyRoute<R> = R extends Route<
  any,
  infer _Method extends number,
  infer _Path extends number,
  any,
  infer _SearParams extends number,
  infer _IBody extends number
>
  ? true
  : false;

// type xx = Simplify<inferResolverOption<AnyRoute>>;
type xx = isAnyRoute<
  Route<{}, "get", ["posts"], {}, {}, null, ParserWithoutInput<string>>
>;
type ay = isAnyRoute<AnyRoute>;
// type y<T> = [keyof T] extends [never] ? "ok" : "not-ok";
// type y<T> = keyof T extends never ? "ok" : "not-ok";
// type xy<T> = T extends number ? any : T extends "ok" ? "ok" : "not-ok";
// type x = xy<string>;

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

export type ErrorResolverFunction = {
  (opts: {
    method: string;
    path: string;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    data: unknown;

    error: unknown;
    errorOrigin: string;

    send: {
      (): ResolverResult<unknown>;
      (opts: {
        error?: any;
        headers?: Record<string, string>;
        status?: number;
        statusText?: string;
      }): ResolverResult<undefined>;
    };
  }): MaybePromise<ResolverResult<unknown>>;
};

export type ResolverFunction<
  Context,
  Method,
  _Paths,
  Params,
  SearchParams,
  IBody,
  OBody
> = {
  (opts: {
    ctx: Context;
    path: string;

    params: {
      [key in keyof Params]: Params[key] extends null
        ? string
        : inferParserType<Params[key]>;
    };
    searchParams: {
      [key in keyof SearchParams]: inferParserType<SearchParams[key]>;
    };
    method: Method;
    data: IBody extends null ? never : inferParserType<IBody>;

    send: {
      (): ResolverResult<unknown>;
      <$OData>(opts: {
        data?: $OData;
        headers?: Record<string, string>;
        status?: number;
        statusText?: string;
      }): ResolverResult<$OData>;
    };
  }): MaybePromise<ResolverResult<OBody>>;
  _type?: string | undefined;
};

export type RouteBuilderDef = {
  method: HTTPMethod;
  paths: string[];
  params: Record<string, Parser>;
  searchParams: Record<string, Parser>;

  iBody?: Parser;
  oBody?: Parser;

  middlewares: MiddlewareFunction<any, any, any, any, any, any, any>[];
  errorResolver?: ErrorResolverFunction;
  resolver?: ResolverFunction<any, any, any, any, any, any, any>;
};

// TODO
// IBody and OBody default type
// OBody Schema implementation
// after middleware
export interface Route<
  Context,
  Method,
  // Paths extends Array<string> = [],
  Paths = [],
  Params = {},
  SearchParams = {},
  IBody = null,
  OBody = null
> {
  _def: RouteBuilderDef;

  error(
    fn: ErrorResolverFunction
  ): Route<Context, Method, Paths, SearchParams, IBody, OBody>;

  path<const T extends string[]>(
    ...paths: T
  ): Route<
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
    }
  >(
    arg: T
  ): Route<
    Context,
    Method,
    Paths,
    Overwrite<Params, T>,
    SearchParams,
    IBody,
    OBody
  >;

  searchParam<const T extends { [key: string]: Parser }>(
    queries: T
  ): Route<Context, Method, Paths, Params, T, IBody>;

  use<ContextOverride>(
    fn: MiddlewareFunction<
      Context,
      ContextOverride,
      Paths,
      Params,
      SearchParams,
      Method,
      IBody
    >
  ): Route<
    Overwrite<Context, ContextOverride>,
    Method,
    Paths,
    Params,
    SearchParams,
    IBody
  >;

  resolve<OBody>(
    fn: ResolverFunction<
      Context,
      Method,
      Paths,
      Params,
      SearchParams,
      IBody,
      OBody
    >
  ): Route<
    Context,
    Method,
    Paths,
    Params,
    SearchParams,
    IBody,
    ParserWithoutInput<OBody>
  >;

  method<M extends HTTPMethod, P extends Parser>(
    method: M,
    parser?: P
  ): Route<Context, M, Paths, Params, SearchParams, P, OBody>;
  get(): Route<Context, "get", Paths, Params, SearchParams, IBody, OBody>;
  post<P extends Parser>(
    parser: P
  ): Route<Context, "post", Paths, Params, SearchParams, P, OBody>;
  put<P extends Parser>(
    parser: P
  ): Route<Context, "put", Paths, Params, SearchParams, P, OBody>;
  delete(): Route<Context, "delete", Paths, Params, SearchParams, IBody, OBody>;
  patch<P extends Parser>(
    parser: P
  ): Route<Context, "patch", Paths, Params, SearchParams, P, OBody>;
  head(): Route<Context, "head", Paths, Params, SearchParams, IBody, OBody>;
}

export type AnyRoute = Route<any, any, any, any, any, any, any>;

// TODO: Fix when given other types
type _inferPathType<
  Paths,
  Params extends Record<string, Parser>
> = Paths extends [infer First extends string, ...infer Tail extends string[]]
  ? `/${First extends `:${infer N}`
      ? Params[N] extends Parser
        ? inferParserType<Params[N]>
        : string
      : First}${_inferPathType<Tail, Params>}`
  : "";
export type inferPathType<
  Paths,
  Params extends Record<string, Parser>
> = Paths extends string[] ? _inferPathType<Paths, Params> : string;

export type inferRoutePath<R> = R extends Route<
  any,
  any,
  infer Path,
  infer Params extends Record<string, Parser>,
  any,
  any
>
  ? inferPathType<Path, Params>
  : never;

export type ExtractRoute<
  R,
  Method extends HTTPMethod,
  Path extends string = any
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
  any
>
  ? Method
  : never;
