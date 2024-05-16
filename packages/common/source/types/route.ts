import { IsAny } from "ts-essentials";
import { Parser, ParserWithoutInput, inferParserType } from "../parser";
import { HTTPMethod } from "./http";
import { MaybePromise, Overwrite, Simplify } from "./utils";

export interface MiddlewareResult<C> {
  ctx: C;
  headers: Record<string, string>; // Header names are lower-case
  status?: number;
  statusText?: string;
  data: any;
}

export type inferSearchParamsType<SearchParams> = Simplify<{
  [key in keyof SearchParams]: inferParserType<SearchParams[key]>;
}>;

export type MiddlewareFunction<
  Options,
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
    res: Omit<Res<Options, Context, OBody>, "send">,
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
  data: Data;
  headers: Record<string, string>;
  status: number;
  statusText: string;
  dataShortcutUsed: string;
}

export type ResolverResultPromise<T = any> = {
  data(): Promise<T>;
} & Promise<ResolverResult<T>>;

export type inferResolverOption<R> = R extends Route<
  any,
  any,
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

type Data<T, Shortcuts> =
  | { data: T }
  | (Shortcuts extends string[]
      ? Shortcuts[number] extends infer U
        ? U extends string
          ? { [P in U]?: T }
          : never
        : never
      : never);

export type isAnyRoute<R> = R extends Route<
  infer _Options,
  infer Context,
  infer ContextOverride,
  infer Method,
  infer Paths,
  infer Params,
  infer SearchParams,
  infer IBody,
  infer OBody
>
  ?
      | IsAny<Context>
      | IsAny<ContextOverride>
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
  Options,
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
    res: Omit<Res<Options, Context, OBody>, "next">,
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

type Res<
  Options,
  Context,
  OBody,
  type extends "error" | "success" = "success",
> = {
  readonly ctx: Context;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly status?: number;
  readonly statusText?: string;
  readonly data: OBody extends null ? never : inferParserType<OBody>;
  send: type extends "success"
    ? {
        (): ResolverResult<unknown>;
        <T>(
          opts: Data<
            T,
            Options extends { dataShortcuts?: any }
              ? Options["dataShortcuts"]
              : []
          > & {
            // data?: T;
            headers?: Record<string, string>;
            status?: number;
            statusText?: string;
          },
        ): ResolverResult<T>;
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
    (): MiddlewareResult<{}>;
    <$ContextOverride>(opts: {
      ctx?: $ContextOverride;
      headers?: Record<string, string>;
      status?: number;
      statusText?: string;
    }): MiddlewareResult<$ContextOverride>;
  };
};

export type RouteBuilderDef<isResolved extends boolean = boolean> = {
  isResolved: isResolved;
  method: HTTPMethod;
  paths: string[];
  params: Record<string, Parser>;
  searchParams: Record<string, Parser>;
  dataShortcuts: string[];

  iBody?: Parser;
  oBody?: Parser;

  middlewares: MiddlewareFunction<
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any
  >[];
  errorResolver: ErrorResolverFunction;
  resolver?: ResolverFunction<any, any, any, any, any, any, any, any, any>;
};

export interface Route<
  Options,
  Context,
  ContextOverride,
  Method,
  Paths,
  Params,
  SearchParams,
  IBody,
  OBody,
> {
  _def: RouteBuilderDef<true>;
}

type _inferPathArray<T> = T extends `${infer P}/${infer Rest}`
  ? [P, ..._inferPathArray<Rest>]
  : T extends `/${infer P}`
    ? [P]
    : [T];

type TrimSlashes<T> = T extends `/${infer U}/`
  ? U
  : T extends `/${infer U}`
    ? U
    : T extends `${infer U}/`
      ? U
      : T;

type inferPathArray<T> = _inferPathArray<TrimSlashes<T>>;

type NotAllowedDataShortcuts =
  | "method"
  | HTTPMethod
  | "paths"
  | "path"
  | "searchParams"
  | "searchParam"
  | "params"
  | "use"
  | "resolve"
  | "output"
  | "data"
  | "headers";

// TODO
// IBody and OBody default type
// OBody Schema implementation
export interface UnresolvedRoute<
  Options,
  Context,
  ContextOverride,
  Method,
  Paths = [],
  Params = {},
  SearchParams = {},
  IBody = null,
  OBody = null,
> {
  _def: RouteBuilderDef<false>;

  // error(
  //   fn: ErrorResolverFunction,
  // ): UnresolvedRoute<
  //   Options,
  //   Context,
  //   ContextOverride,
  //   Method,
  //   Paths,
  //   SearchParams,
  //   IBody,
  //   OBody
  // >;

  options<const $DataShortcuts extends string[] = []>(options?: {
    dataShortcuts?: $DataShortcuts;
  }): $DataShortcuts extends NotAllowedDataShortcuts
    ? "Invalid DataShortcut"
    : UnresolvedRoute<
        {
          dataShortcuts: $DataShortcuts;
        },
        Context,
        ContextOverride,
        Method,
        Paths,
        SearchParams,
        IBody,
        OBody
      >;

  path<const T extends string>(
    path: T,
  ): UnresolvedRoute<
    Options,
    Context,
    ContextOverride,
    Method,
    Paths extends Array<string>
      ? [...Paths, ...inferPathArray<T>]
      : inferPathArray<T>,
    Params & {
      [key in inferPathArray<T>[number] as key extends `:${infer N}`
        ? N
        : never]: null;
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
    Options,
    Context,
    ContextOverride,
    Method,
    Paths,
    Overwrite<Params, T>,
    SearchParams,
    IBody,
    OBody
  >;

  searchParams<const T extends { [key: string]: Parser }>(
    queries: T,
  ): UnresolvedRoute<
    Options,
    Context,
    ContextOverride,
    Method,
    Paths,
    Params,
    T,
    IBody
  >;

  use<$ContextOverride>(
    fn: MiddlewareFunction<
      Options,
      ContextOverride,
      $ContextOverride,
      Paths,
      Params,
      SearchParams,
      Method,
      IBody,
      OBody
    >,
  ): UnresolvedRoute<
    Options,
    Context,
    Overwrite<ContextOverride, $ContextOverride>,
    Method,
    Paths,
    Params,
    SearchParams,
    IBody
  >;

  resolve<T>(
    fn: ResolverFunction<
      Options,
      ContextOverride,
      Method,
      Paths,
      Params,
      SearchParams,
      IBody,
      OBody,
      T
    >,
  ): Route<
    Options,
    Context,
    ContextOverride,
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
  ): UnresolvedRoute<
    Options,
    Context,
    ContextOverride,
    M,
    Paths,
    Params,
    SearchParams,
    P,
    OBody
  >;
  get(): UnresolvedRoute<
    Options,
    Context,
    ContextOverride,
    "get",
    Paths,
    Params,
    SearchParams,
    IBody,
    OBody
  >;
  post<P extends Parser>(
    parser: P,
  ): UnresolvedRoute<
    Options,
    Context,
    ContextOverride,
    "post",
    Paths,
    Params,
    SearchParams,
    P,
    OBody
  >;
  put<P extends Parser>(
    parser: P,
  ): UnresolvedRoute<
    Options,
    Context,
    ContextOverride,
    "put",
    Paths,
    Params,
    SearchParams,
    P,
    OBody
  >;
  delete(): UnresolvedRoute<
    Options,
    Context,
    ContextOverride,
    "delete",
    Paths,
    Params,
    SearchParams,
    IBody,
    OBody
  >;
  patch<P extends Parser>(
    parser: P,
  ): UnresolvedRoute<
    Options,
    Context,
    ContextOverride,
    "patch",
    Paths,
    Params,
    SearchParams,
    P,
    OBody
  >;
  head(): UnresolvedRoute<
    Options,
    Context,
    ContextOverride,
    "head",
    Paths,
    Params,
    SearchParams,
    IBody,
    OBody
  >;
}

export type AnyRoute = Route<any, any, any, any, any, any, any, any, any>;
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
  any,
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

export type inferRouteContext<R> = R extends Route<
  any,
  infer Context,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>
  ? Context
  : never;

export type inferRouteDataShortcut<R> = R extends Route<
  infer Options extends { dataShortcuts: string[] },
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>
  ? Options["dataShortcuts"][number]
  : never;

export type inferRouteMethod<R> = R extends Route<
  any,
  any,
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
