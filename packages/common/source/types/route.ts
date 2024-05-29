import { IsAny } from "ts-essentials";
import {
  Parser,
  ParserWithoutInput,
  inferCurrentData,
  inferParserType,
} from "../parser";
import { DredgeHeaders, DredgeSearchParams, HTTPMethod } from "./http";
import { MaybePromise, Overwrite, Simplify } from "./utils";

export interface ResolverOptions {
  ctx?: object;
  method?: HTTPMethod | string;
  data?: any;
  path: string;
  headers?: Record<string, string | string[] | undefined>;
  searchParams?: Record<string, any>;
}

export type ResolverResultPromise<T = any> = {
  data(): Promise<T>;
} & Promise<ResolverResult<T>>;

export type inferResolverResult<R> = R extends Route<
  any,
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
  ? ResolverResult<OBody extends Parser ? inferParserType<OBody> : unknown>
  : never;

export type inferResolverOption<R> = R extends Route<
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

// ---

export type inferSearchParamsType<SearchParams> = Simplify<{
  [key in keyof SearchParams]: inferParserType<SearchParams[key]>;
}>;

type inferParamsType<Params> = Simplify<{
  [key in keyof Params]: Params[key] extends null
    ? string
    : inferParserType<Params[key]>;
}>;

export interface MiddlewareResult<C, Data = null> {
  ctx: C;
  headers: Record<string, string>; // Header names are lower-case
  status?: number;
  statusText?: string;
  data?: Data;
  dataType?: string;
}

export interface ResolverResult<Data> {
  data: Data;
  headers: DredgeHeaders;
  status: number;
  statusText: string;
  dataShortcutUsed: string;
}

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
  infer OBody,
  infer EBody
>
  ?
      | IsAny<Context>
      | IsAny<ContextOverride>
      | IsAny<Method>
      | IsAny<Paths>
      | IsAny<Params>
      | IsAny<SearchParams>
      | IsAny<IBody>
      | IsAny<OBody>
      | IsAny<EBody> extends true
    ? true
    : false
  : false;

export type inferResolverResultPromise<R> = R extends Route<
  any,
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
  ? ResolverResultPromise<
      OBody extends Parser ? inferParserType<OBody> : unknown
    >
  : never;

type inferDataTypes<Options> = Options extends { dataShortcuts?: any }
  ? Options["dataShortcuts"]
  : [];

export type MiddlewareFunction<
  DataTypes,
  Context,
  NewContext,
  Method,
  Params,
  SearchParams,
  IData,
  OData,
  NewOData,
> = {
  (
    req: Readonly<{
      method: Method;
      path: string;
      params: Params;
      searchParams: SearchParams;
      headers: DredgeHeaders;
      data: IData;
    }>,
    res: Readonly<{
      ctx: Context;
      headers: DredgeHeaders;
      status?: number;
      statusText?: string;
      data: OData;
      next: NextFunction<DataTypes>;
    }>,
  ): MaybePromise<MiddlewareResult<NewContext, NewOData>>;
};

export type ErrorMiddlewareFunction<
  DataTypes,
  Context,
  NewContext,
  EData,
  NewEData,
> = {
  (
    error: any,
    req: Readonly<{
      method: string;
      path: string;
      params: Record<string, string>;
      searchParams: DredgeSearchParams;
      headers: DredgeHeaders;
      data: unknown;
    }>,
    res: Readonly<{
      ctx: Context;
      headers: DredgeHeaders;
      status?: number;
      statusText?: string;
      data: EData;
      next: NextFunction<DataTypes>;
    }>,
  ): MaybePromise<MiddlewareResult<NewContext, NewEData>>;
};

export type ResolverFunction<
  DataTypes,
  Context,
  Method,
  Params,
  SearchParams,
  IData,
  OData,
  ODataStructure,
  NewOData,
> = {
  (
    req: Readonly<{
      method: Method;
      path: string;
      params: Params;
      searchParams: SearchParams;
      headers: DredgeHeaders;
      data: IData;
    }>,
    res: Readonly<{
      ctx: Context;
      headers: DredgeHeaders;
      status?: number;
      statusText?: string;
      data: OData;
      end: EndFunction<DataTypes, ODataStructure>;
    }>,
  ): MaybePromise<ResolverResult<NewOData>>;
  _type?: string | undefined;
};

export type RejectorFunction<DataTypes, Context, Method, OData, NewOData> = {
  (
    error: any,
    req: Readonly<{
      method: Method;
      path: string;
      params: Record<string, string>;
      searchParams: DredgeSearchParams;
      headers: DredgeHeaders;
      data: unknown;
    }>,
    res: Readonly<{
      ctx: Context;
      headers: DredgeHeaders;
      status?: number;
      statusText?: string;
      data: OData;
      end: EndFunction<DataTypes>;
    }>,
  ): MaybePromise<ResolverResult<NewOData>>;
  _type?: string | undefined;
};

type NextFunction<DataTypes = [], DT = any> = {
  (): MiddlewareResult<{}>;
  <$ContextOverride, T extends DT>(
    opts: Data<T, DataTypes> & {
      ctx?: $ContextOverride;
      headers?: Record<string, string>;
      status?: number;
      statusText?: string;
    },
  ): MiddlewareResult<$ContextOverride, T>;
};

type EndFunction<DataTypes = [], DT = any> = {
  (): ResolverResult<null>;
  <T extends DT>(
    opts: Data<T, DataTypes> & {
      headers?: Record<string, string>;
      status?: number;
      statusText?: string;
    },
  ): ResolverResult<T>;
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
  errorMiddlewares: ErrorMiddlewareFunction<any, any, any, any, any>[];
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
  EBody,
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
  | "default"
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

interface ContextOverrideType {
  success: object;
  error: object;
}

type GetContextOverride<
  T,
  U extends keyof ContextOverrideType,
> = T extends ContextOverrideType ? T[U] : {};

type UpdateCurrentDataType<T, U> = T extends { _current: any }
  ? Omit<T, "_current"> & { _current: U }
  : { _current: U };

type UpdateActualDataType<T, U> = T extends { _current: any }
  ? U & { _current: T["_current"] }
  : U;

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
  EBody = null,
> {
  _def: RouteBuilderDef<false>;

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
    OBody,
    EBody
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
    OBody,
    EBody
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
    IBody,
    EBody
  >;

  use<NewContext, NewOData>(
    fn: MiddlewareFunction<
      inferDataTypes<Options>,
      GetContextOverride<ContextOverride, "success">,
      NewContext,
      Method,
      inferParamsType<Params>,
      inferSearchParamsType<SearchParams>,
      inferParserType<IBody>,
      inferCurrentData<OBody>,
      NewOData
    >,
  ): UnresolvedRoute<
    Options,
    Context,
    // Overwrite<ContextOverride, $ContextOverride>,
    {
      success: Overwrite<
        GetContextOverride<ContextOverride, "success">,
        NewContext
      >;
      error: GetContextOverride<ContextOverride, "error">;
    },
    Method,
    Paths,
    Params,
    SearchParams,
    IBody,
    UpdateCurrentDataType<OBody, NewOData>,
    EBody
  >;

  error<NewContext, NewEData>(
    fn: ErrorMiddlewareFunction<
      inferDataTypes<Options>,
      GetContextOverride<ContextOverride, "error">,
      NewContext,
      inferCurrentData<EBody>,
      NewEData
    >,
  ): UnresolvedRoute<
    Options,
    Context,
    {
      success: GetContextOverride<ContextOverride, "success">;
      error: Overwrite<
        GetContextOverride<ContextOverride, "error">,
        NewContext
      >;
    },
    Method,
    Paths,
    SearchParams,
    IBody,
    OBody,
    EBody
  >;

  output<P extends Parser>(): UnresolvedRoute<
    Options,
    Context,
    ContextOverride,
    Method,
    Paths,
    Params,
    SearchParams,
    IBody,
    UpdateActualDataType<OBody, P>,
    EBody
  >;

  done<ST, ET>(
    resolve: ResolverFunction<
      inferDataTypes<Options>,
      GetContextOverride<ContextOverride, "success">,
      Method,
      inferParamsType<Params>,
      inferSearchParamsType<SearchParams>,
      inferParserType<IBody>,
      inferCurrentData<OBody>,
      inferParserType<OBody>,
      ST
    >,
    reject: RejectorFunction<
      inferDataTypes<Options>,
      GetContextOverride<ContextOverride, "error">,
      Method,
      inferCurrentData<EBody>,
      ET
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
    inferParserType<OBody> extends never
      ? UpdateCurrentDataType<ParserWithoutInput<ST>, ST>
      : UpdateCurrentDataType<OBody, ST>,
    inferParserType<EBody> extends never
      ? UpdateCurrentDataType<ParserWithoutInput<ET>, ET>
      : UpdateCurrentDataType<EBody, ET>
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
    OBody,
    EBody
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
    OBody,
    EBody
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
    OBody,
    EBody
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
    OBody,
    EBody
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
    OBody,
    EBody
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
    OBody,
    EBody
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
    OBody,
    EBody
  >;
}

export type AnyRoute = Route<any, any, any, any, any, any, any, any, any, any>;
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
  any,
  any
>
  ? Method
  : never;
