import { HTTPMethod } from "./http";
import {
  AnyRoute,
  ExtractRoute,
  ResolverOptions,
  ResolverResult,
  inferResolverOption,
  inferResolverResultPromise,
  inferRouteContext,
  inferRouteDataShortcut,
  inferRouteMethod,
  inferRoutePath,
  isAnyRoute,
} from "./route";
import { MarkOptional, MaybePromise, Overwrite, Simplify } from "./utils";

export type inferApiRoutes<Api> = Api extends DredgeApi<
  any,
  infer Routes extends AnyRoute[],
  any,
  any,
  any
>
  ? Routes
  : never;

export type inferApiContext<Api> = Api extends DredgeApi<
  infer Context,
  any,
  any,
  any,
  any
>
  ? Context
  : {};

export type inferRouteUnion<Api> = inferApiRoutes<Api>[number];

export type DredgeResolverOptions<Context> = {
  ctx?: Context;
  method?: HTTPMethod | string;
  data?: any;
  path: string;
  headers?: Record<string, string | string[] | undefined>;
  searchParams?: Record<string, any>;
};

export interface ApiBuilderDef {
  options: {
    prefixUrl?: URL;
    defaultContext?: object;
  };
  routes: AnyRoute[];
  inputTransformers: TransformInMiddlewareFunction<any, any>[];
  outputTransformers: TransformOutMiddlewareFunction<any, any, any>[];
  errorMiddlewares: Function[];
}

export interface DredgeApi<
  Context,
  Routes,
  TransformInCtx,
  TransformOutCtx,
  ErrorCtx,
> {
  _def: ApiBuilderDef;

  options<const DefaultContext extends Partial<Context>>(options: {
    defaultContext: DefaultContext;
    prefixUrl: string | URL;
  }): DredgeApi<
    keyof DefaultContext extends keyof Context
      ? MarkOptional<Context, keyof DefaultContext>
      : Context,
    Routes,
    TransformInCtx,
    TransformOutCtx,
    ErrorCtx
  >;

  routes<const $Routes extends Array<AnyRoute>>(
    routes: $Routes,
  ): inferRouteContext<$Routes[number]> extends Context
    ? DredgeApi<
        Context,
        Routes extends Array<AnyRoute> ? [...Routes, ...$Routes] : $Routes,
        TransformInCtx,
        TransformOutCtx,
        ErrorCtx
      >
    : "Context do not match!";

  transformIn<$ContextOverride>(
    fn: TransformInMiddlewareFunction<TransformInCtx, $ContextOverride>,
  ): DredgeApi<
    Context,
    Routes,
    Overwrite<TransformInCtx, $ContextOverride>,
    TransformOutCtx,
    ErrorCtx
  >;

  transformOut<$ContextOverride>(
    fn: TransformOutMiddlewareFunction<
      TransformOutCtx,
      $ContextOverride,
      Routes
    >,
  ): DredgeApi<
    Context,
    Routes,
    TransformInCtx,
    Overwrite<TransformOutCtx, $ContextOverride>,
    ErrorCtx
  >;

  error(
    fn: ErrorMiddlewareFunction,
  ): DredgeApi<Context, Routes, TransformInCtx, TransformOutCtx, ErrorCtx>;

  resolveRoute(ctx: Context, request: RawRequest): Promise<RawResponse>;

  resolveRouteWithoutTransforms(
    ctx: Context,
    request: Omit<ParsedRequest, "params">,
  ): Promise<ParsedResponse>;

  // _transformRequest(
  //   ctx: Context,
  //   request: RawRequest | ParsedRequest,
  // ): Promise<ParsedRequest>;

  transformRequest(
    ctx: Context,
    request: RawRequest & {
      $parsed: ParsedRequest;
    },
  ): Promise<ParsedRequest>;

  transformResponse(
    ctx: Context,
    request: ParsedRequest,
    response: ParsedResponse,
  ): Promise<RawResponse>;

  // transformError(error: any): Promise<RawResponse>;
}

export type AnyDredgeApi = DredgeApi<any, any, any, any, any>;

export type RawRequest = {
  method: string;
  url: URL;
  headers: Record<string, string>;
  body: unknown;
};

export type RawResponse = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
};

export type ParsedRequest = {
  method: string;
  path: string;
  params: Record<string, string>;
  searchParams: ParsedSearchParams;
  headers: Record<string, string>;
  data: unknown;
};

export type ParsedResponse = {
  status?: number;
  statusText?: string;
  headers: Record<string, string>;
  data: unknown;
  dataShortcutUsed: string;
};

export type ParsedSearchParams = Record<string, string | string[]>;

type TransformInMiddlewareResult<ContextOverride> = ParsedRequest & {
  ctx: ContextOverride;
};

type TransformOutMiddlewareResult<ContextOverride> = RawResponse & {
  ctx: ContextOverride;
};

type TransformOutMiddlewareFunction<Context, ContextOverride, Routes> = {
  (
    req: ParsedRequest,
    res: ParsedResponse & {
      ctx: Context;
      dataShortcutUsed:
        | "auto"
        | (Routes extends AnyRoute[]
            ? inferRouteDataShortcut<Routes[number]>
            : never);
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
          searchParams?: ParsedSearchParams;
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

interface _ResolveRoute<Context extends object, Routes extends AnyRoute[]> {
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

export interface _DredgeApi<Context extends object, Routes extends AnyRoute[]> {
  _def: {
    root: any;
  };

  resolveRoute: _ResolveRoute<Context, Routes>;
}
