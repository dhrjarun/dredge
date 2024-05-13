import { HTTPMethod } from "./http";
import {
  AnyRoute,
  ExtractRoute,
  ResolverOptions,
  ResolverResult,
  inferResolverOption,
  inferResolverResultPromise,
  inferRouteContext,
  inferRouteMethod,
  inferRoutePath,
  isAnyRoute,
} from "./route";
import { MaybePromise, Overwrite, Simplify } from "./utils";

export type inferRoutes<Api> = Api extends DredgeApi<any, infer Routes>
  ? Routes
  : never;
export type inferRouteUnion<Api> = inferRoutes<Api>[number];

export interface ResolveRoute<
  Context extends object,
  Routes extends AnyRoute[],
> {
  <
    P extends inferRoutePath<Routes[number]>,
    M extends inferRouteMethod<ExtractRoute<Routes[number], any, P>>,
    R extends ExtractRoute<Routes[number], M, P>,
  >(
    path: P,
    options: isAnyRoute<R> extends true
      ? Omit<ResolverOptions, "path">
      : Simplify<
          { method: M } & Omit<
            inferResolverOption<R>,
            "path" | "method" | "ctx"
          > &
            (keyof Context extends never ? {} : { ctx: Context })
        >,
  ): inferResolverResultPromise<R>;
}

export interface DredgeApi<Context extends object, Routes extends AnyRoute[]> {
  _def: {
    root: any;
  };

  resolveRoute: ResolveRoute<Context, Routes>;
}
export type DredgeResolverOptions<Context> = {
  ctx?: Context;
  method?: HTTPMethod | string;
  data?: any;
  path: string;
  headers?: Record<string, string | string[] | undefined>;
  searchParams?: Record<string, any>;
};

export interface ApiBuilderDef {
  routes: AnyRoute[];
  inputTransformers: TransformInMiddlewareFunction<any, any>[];
  outputTransformers: TransformOutMiddlewareFunction<any, any>[];
  errorMiddlewares: Function[];
}

export interface _DredgeApi<
  Context,
  Routes,
  TransformInCtx,
  TransformOutCtx,
  ErrorCtx,
> {
  _def: ApiBuilderDef;

  routes<$Routes extends Array<AnyRoute>>(
    routes: $Routes,
  ): inferRouteContext<$Routes[number]> extends Context
    ? _DredgeApi<
        Routes extends Array<AnyRoute> ? [...Routes, ...$Routes] : $Routes,
        Context,
        TransformInCtx,
        TransformOutCtx,
        ErrorCtx
      >
    : "Context do not match!";

  transformIn<$ContextOverride>(
    fn: TransformInMiddlewareFunction<TransformInCtx, $ContextOverride>,
  ): _DredgeApi<
    Context,
    Routes,
    Overwrite<TransformInCtx, $ContextOverride>,
    TransformOutCtx,
    ErrorCtx
  >;

  transformOut<$ContextOverride>(
    fn: TransformOutMiddlewareFunction<TransformOutCtx, $ContextOverride>,
  ): _DredgeApi<
    Context,
    Routes,
    TransformInCtx,
    Overwrite<TransformOutCtx, $ContextOverride>,
    ErrorCtx
  >;

  error(
    fn: ErrorMiddlewareFunction,
  ): _DredgeApi<Context, Routes, TransformInCtx, TransformOutCtx, ErrorCtx>;

  resolveRoute(
    request: RawRequest & {
      ctx: Context;
    },
  ): Promise<RawResponse>;

  resolveRouteWithoutTransforms(
    request: Omit<ParsedRequest, "params"> & {
      ctx: Context;
    },
  ): Promise<ParsedResponse>;

  transformRequest(
    request: RawRequest & {
      ctx: Context;
    },
  ): Promise<ParsedRequest>;

  transformResponse(
    request: ParsedRequest,
    response: ParsedResponse & {
      ctx: Context;
    },
  ): Promise<RawResponse>;

  transformError(error: any): Promise<RawResponse>;
}

export type AnyDredgeApi = _DredgeApi<any, any, any, any, any>;

export type RawRequest = {
  method: string;
  url: URL;
  headers: Record<string, string>;
  body: unknown;
};

export type RawResponse = {
  status?: number;
  statusText?: string;
  headers: Record<string, string>;
  body: unknown;
};

export type ParsedRequest = {
  method: string;
  path: string;
  params: Record<string, string>;
  searchParams: Record<string, string | string[]>;
  headers: Record<string, string>;
  data: unknown;
};

export type ParsedResponse = {
  status?: number;
  statusText?: string;
  headers: Record<string, string>;
  data: unknown;
};

type TransformInMiddlewareResult<ContextOverride> = Partial<ParsedRequest> & {
  ctx: ContextOverride;
};

type TransformOutMiddlewareResult<ContextOverride> = Partial<RawRequest> & {
  ctx: ContextOverride;
};

type TransformOutMiddlewareFunction<Context, ContextOverride> = {
  (
    req: ParsedRequest,
    res: ParsedResponse & {
      ctx: Context;
      next: {
        (): TransformOutMiddlewareResult<{}>;
        <$ContextOverride>(opts: {
          ctx?: $ContextOverride;
          status?: number;
          statusText?: number;
          headers?: Record<string, string>;
          body?: any;
        }): TransformOutMiddlewareResult<$ContextOverride>;
      };
      $raw: RawResponse;
    },
  ): MaybePromise<TransformOutMiddlewareResult<ContextOverride>>;
};

type TransformInMiddlewareFunction<Context, ContextOverride> = {
  (
    req: RawRequest & {
      ctx: Context;
      next: {
        (): TransformInMiddlewareResult<{}>;
        <$ContextOverride>(opts: {
          ctx?: $ContextOverride;
          path?: string;
          searchParams?: number;
          data?: any;
          headers?: Record<string, string>;
        }): TransformInMiddlewareResult<$ContextOverride>;
      };
      $parsed: ParsedRequest;
    },
  ): MaybePromise<TransformInMiddlewareResult<ContextOverride>>;
};

type ErrorMiddlewareFunction = {
  (
    errorInfo: {
      errorOrigin: string;
      error: unknown;
    },
    req: ParsedRequest,
    res: {
      status?: number;
      statusText?: string;
      headers: Record<string, string>;
      data: unknown;
      ctx: {};
      $raw: RawResponse;
    },
  ): MaybePromise<ResolverResult<unknown>>;
};
