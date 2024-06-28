import { Exact, IsAny, IsNever, IsUnknown } from "ts-essentials";
import { Parser, ParserWithoutInput, inferParserType } from "../parser";
import { DredgeHeaders, DredgeSearchParams, HTTPMethod } from "./http";
import { MaybePromise, Overwrite, Simplify } from "./utils";

// export type inferSearchParamsType<SearchParams> = Simplify<{
//   [key in keyof SearchParams]: inferParserType<SearchParams[key]>;
// }>;
export type inferSearchParamsType<SearchParams> = Simplify<{
  [key in keyof SearchParams]:
    | inferParserType<SearchParams[key]>
    | inferParserType<SearchParams[key]>[];
}>;

type inferParamsType<Params> = Simplify<{
  [key in keyof Params]: Params[key] extends null
    ? string
    : inferParserType<Params[key]>;
}>;

export interface NextResult<C, Data = never> {
  ctx: C;
  headers: Record<string, string>; // Header names are lower-case
  status?: number;
  statusText?: string;
  data?: Data;
  dataType?: string;
}

export interface EndResult<Data = null> {
  data: Data;
  headers: DredgeHeaders;
  status: number;
  statusText: string;
  dataType: string;
}

export interface MiddlewareResult<C, Data> {
  ctx: C;
  headers: Record<string, string>; // Header names are lower-case
  status?: number;
  statusText?: string;
  data?: Data;
  dataType?: string;
  isEnd: boolean;
}

type Data<Shortcuts, T> =
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

type inferDataTypes<Options> = Options extends { dataTypes?: any }
  ? Options["dataTypes"]
  : [];

type ParamMethod<P> = {
  <T extends keyof P>(
    key: T,
  ): P extends { [key in T]: any } ? P[T] : string | undefined;
  <T extends string>(key: T): string | undefined;
  (): Simplify<P & Record<string, any>>;
};

export type AnyMiddlewareFunction = MiddlewareFunction<
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>;
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
      url: string;
      method: Method;
      headers: DredgeHeaders;
      param: ParamMethod<Params>;
      searchParam: ParamMethod<SearchParams>;
      searchParams: {
        <T extends keyof SearchParams>(
          key: T,
        ): SearchParams extends { [key in T]: any }
          ? SearchParams[T][]
          : string[];
        <T extends string>(key: T): string[];
        (): Simplify<
          { [key in keyof SearchParams]: SearchParams[key][] } & Record<
            string,
            any[]
          >
        >;
      };
      data: IData;
    }>,
    res: Readonly<{
      ctx: Context;
      headers: DredgeHeaders;
      status?: number;
      statusText?: string;
      data: OData;
      next: NextFunction<DataTypes>;
      end: EndFunction<DataTypes>;
    }>,
  ): MaybePromise<MiddlewareResult<NewContext, NewOData>> | void;
};

export type AnyErrorMiddlewareFunction = ErrorMiddlewareFunction<
  any,
  any,
  any,
  any,
  any
>;
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
      url: string;
      param: {
        <T extends string>(key: T): string | undefined;
        (): Record<string, string>;
      };
      searchParam: {
        <T extends string>(key: T): string | undefined;
        (): Record<string, string>;
      };
      searchParams: {
        <T extends string>(key: T): string[];
        (): Record<string, string[]>;
      };
      headers: DredgeHeaders;
      data: unknown;
    }>,
    res: Readonly<{
      ctx: Context;
      headers: DredgeHeaders;
      status?: number;
      statusText?: string;
      data: EData;
      next: NextFunction<DataTypes, EData>;
      end: EndFunction<DataTypes, EData>;
    }>,
  ): MaybePromise<NextResult<NewContext, NewEData>>;
};

type NextFunction<DataTypes = [], DT = any> = {
  (): MiddlewareResult<{}, any>;
  <$ContextOverride, T extends DT>(
    opts: Data<DataTypes, T> & {
      ctx?: $ContextOverride;
      headers?: Record<string, string>;
      status?: number;
      statusText?: string;
    },
  ): MiddlewareResult<$ContextOverride, T>;
};

type EndFunction<DataTypes = [], DT = any> = {
  (): MiddlewareResult<{}, null>;
  <T extends DT>(
    opts: Data<DataTypes, T> & {
      headers?: Record<string, string>;
      status?: number;
      statusText?: string;
    },
  ): MiddlewareResult<{}, T>;
};

export type RouteBuilderDef<isResolved extends boolean = boolean> = {
  isResolved: isResolved;
  method: HTTPMethod;
  paths: string[];
  params: Record<string, Parser>;
  searchParams: Record<string, Parser>;
  dataTypes: string[];

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

type inferSuccessContext<T> = T extends ContextOverrideType ? T["success"] : {};
type inferErrorContext<T> = T extends ContextOverrideType ? T["error"] : {};

type OverwriteSuccessContext<ContextOverride, NewContext> = {
  success: Overwrite<inferSuccessContext<ContextOverride>, NewContext>;
  error: inferErrorContext<ContextOverride>;
};
type OverwriteErrorContext<ContextOverride, NewContext> = {
  success: inferErrorContext<ContextOverride>;
  error: Overwrite<inferErrorContext<ContextOverride>, NewContext>;
};

type inferParserTypeIfNever<P, U = any> = IsNever<P> extends true
  ? U
  : inferParserType<P>;

export interface UnresolvedRoute<
  Options,
  Context,
  ContextOverride,
  Method,
  Paths = [],
  Params = {},
  SearchParams = {},
  IBody = ParserWithoutInput<unknown>,
  OBody = never,
  EBody = never,
> {
  _def: RouteBuilderDef<false>;

  options<const $DataTypes extends string[] = []>(options?: {
    dataTypes?: $DataTypes;
  }): $DataTypes extends NotAllowedDataShortcuts
    ? "One or more of dataType is invalid!"
    : UnresolvedRoute<
        {
          dataTypes: $DataTypes;
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
    Omit<Params, keyof T> & T,
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
    Omit<SearchParams, keyof T> & T,
    IBody,
    OBody,
    EBody
  >;

  use<
    NewContext = {},
    NewOData extends inferParserTypeIfNever<OBody, any> = never,
  >(fn: {
    (
      req: Readonly<{
        url: string;
        method: Method;
        headers: DredgeHeaders;
        searchParam: ParamMethod<SearchParams>;
        param: ParamMethod<Params>;
        data: inferParserType<IBody>;
      }>,
      res: Readonly<{
        ctx: inferSuccessContext<ContextOverride>;
        headers: DredgeHeaders;
        status?: number;
        statusText?: string;
        data: inferParserTypeIfNever<OBody, null>;
        next: NextFunction<
          inferDataTypes<Options>,
          inferParserTypeIfNever<OBody, any>
        >;
        end: EndFunction<
          inferDataTypes<Options>,
          inferParserTypeIfNever<OBody, any>
        >;
      }>,
    ): MaybePromise<MiddlewareResult<NewContext, NewOData>> | void;
  }): UnresolvedRoute<
    Options,
    Context,
    OverwriteSuccessContext<ContextOverride, NewContext>,
    Method,
    Paths,
    Params,
    SearchParams,
    IBody,
    IsNever<OBody> extends true
      ? IsNever<NewOData> extends false // not sure why never is not working, that's why going with undefined
        ? ParserWithoutInput<NewOData>
        : OBody
      : OBody,
    EBody
  >;

  error<
    NewContext,
    NewEData extends inferParserTypeIfNever<EBody, any> = never,
  >(fn: {
    (
      error: any,
      req: Readonly<{
        method: string;
        path: string;
        params: <T extends string>(key: T) => string | undefined;
        searchParam: <T extends string>(key: T) => string | undefined;
        headers: DredgeHeaders;
        data: unknown;
      }>,
      res: Readonly<{
        ctx: inferErrorContext<ContextOverride>;
        headers: DredgeHeaders;
        status?: number;
        statusText?: string;
        data: inferParserTypeIfNever<EBody, null>;
        next: NextFunction<
          inferDataTypes<Options>,
          inferParserTypeIfNever<EBody, any>
        >;
        end: EndFunction<
          inferDataTypes<Options>,
          inferParserTypeIfNever<EBody, any>
        >;
      }>,
    ): MaybePromise<NextResult<NewContext, NewEData>>;
  }): UnresolvedRoute<
    Options,
    Context,
    OverwriteErrorContext<ContextOverride, NewContext>,
    Method,
    Paths,
    SearchParams,
    IBody,
    OBody,
    IsNever<EBody> extends true
      ? IsNever<NewEData> extends false
        ? ParserWithoutInput<NewEData>
        : EBody
      : EBody
  >;

  build(): Route<
    Options,
    Context,
    ContextOverride,
    Method,
    Paths,
    Params,
    SearchParams,
    IBody,
    OBody,
    EBody
  >;

  output<P extends Parser>(
    parser: P,
  ): UnresolvedRoute<
    Options,
    Context,
    ContextOverride,
    Method,
    Paths,
    Params,
    SearchParams,
    IBody,
    P,
    EBody
  >;

  // done<ST, ET>(
  //   resolve: ResolverFunction<
  //     inferDataTypes<Options>,
  //     GetContextOverride<ContextOverride, "success">,
  //     Method,
  //     inferParamsType<Params>,
  //     inferSearchParamsType<SearchParams>,
  //     inferParserType<IBody>,
  //     inferParserType<OBody>,
  //     inferParserType<OBody>,
  //     ST
  //   >,
  //   reject: RejectorFunction<
  //     inferDataTypes<Options>,
  //     GetContextOverride<ContextOverride, "error">,
  //     Method,
  //     inferParserType<EBody>,
  //     ET
  //   >,
  // ): Route<
  //   Options,
  //   Context,
  //   ContextOverride,
  //   Method,
  //   Paths,
  //   Params,
  //   SearchParams,
  //   IBody,
  //   inferParserType<OBody> extends never
  //     ? UpdateCurrentDataType<ParserWithoutInput<ST>, ST>
  //     : UpdateCurrentDataType<OBody, ST>,
  //   inferParserType<EBody> extends never
  //     ? UpdateCurrentDataType<ParserWithoutInput<ET>, ET>
  //     : UpdateCurrentDataType<EBody, ET>
  // >;

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
