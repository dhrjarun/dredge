import { IsAny, IsNever, MarkOptional, Merge } from "ts-essentials";
import { Parser, ParserWithoutInput, inferParserType } from "../parser";
import { HTTPMethod } from "./http";
import { MaybePromise, Overwrite, Simplify } from "./utils";

export type inferSingleSearchParamsType<SearchParams> = Simplify<{
  [key in keyof SearchParams]: inferParserType<SearchParams[key]>;
}>;
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
  | { data?: T }
  | (Shortcuts extends string[]
      ? Shortcuts[number] extends infer U
        ? U extends string
          ? { [P in U]?: T }
          : never
        : never
      : never);

export type isAnyRoute<R> = R extends Route<
  infer _Options,
  infer SuccessContext,
  infer ErrorContext,
  infer Method,
  infer Paths,
  infer Params,
  infer SearchParams,
  infer IBody,
  infer OBody,
  infer EBody
>
  ?
      | IsAny<SuccessContext>
      | IsAny<ErrorContext>
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

type ParamFunction<P> = {
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
    req: {
      readonly url: string;
      readonly method: Method;
      readonly data: IData;
      header: {
        (headerName: string): string | undefined;
        (): Record<string, string>;
      };
      param: ParamFunction<Params>;
      searchParam: ParamFunction<SearchParams>;
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
    },
    res: {
      readonly ctx: Context;
      readonly status?: number;
      readonly statusText?: string;
      readonly data: OData;
      readonly dataType?: DataTypes extends string[]
        ? DataTypes[number]
        : undefined;
      header: {
        (headerName: string): string | undefined;
        (): Record<string, string>;
      };
      next: NextFunction<DataTypes>;
      end: EndFunction<DataTypes>;
    },
  ): MaybePromise<MiddlewareResult<NewContext, NewOData> | void>;
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
    req: {
      readonly method: string;
      readonly url: string;
      readonly data: unknown;

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
      header: {
        (headerName: string): string | undefined;
        (): Record<string, string>;
      };
    },
    res: {
      readonly ctx: Context;
      readonly status?: number;
      readonly statusText?: string;
      readonly data: EData;
      readonly dataType?: DataTypes extends string[]
        ? DataTypes[number]
        : undefined;

      header: {
        (headerName: string): string | undefined;
        (): Record<string, string>;
      };
      next: NextFunction<DataTypes>;
      end: EndFunction<DataTypes>;
    },
  ): MaybePromise<MiddlewareResult<NewContext, NewEData> | void> | void;
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
  method?: HTTPMethod;
  paths: string[];
  params: Record<string, Parser>;
  searchParams: Record<string, Parser>;
  dataTypes: string[];
  defaultContext?: any;
  dataTransformer: Record<
    string,
    {
      forRequest?: (data: any) => any;
      forResponse?: (data: any) => any;
    }
  >;

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
  SuccessContext,
  ErrorContext,
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

type inferParserTypeIfNever<P, U = any> = IsNever<P> extends true
  ? U
  : inferParserType<P>;

export interface UnresolvedRoute<
  Options,
  SuccessContext,
  ErrorContext,
  Method,
  Paths = [],
  Params = {},
  SearchParams = {},
  IBody = ParserWithoutInput<unknown>,
  OBody = never,
  EBody = never,
> {
  _def: RouteBuilderDef<false>;

  options<
    const $DataTypes extends string[],
    const DefaultContext extends Partial<
      Options extends { initialContext: any } ? Options["initialContext"] : {}
    >,
  >(options?: {
    dataTypes?: $DataTypes;
    dataTransformer?: {
      [key in $DataTypes[number]]?: {
        forRequest?: (data: any) => any;
        forResponse?: (data: any) => any;
      };
    };
    defaultContext?: DefaultContext;
  }): $DataTypes extends NotAllowedDataShortcuts
    ? "One or more of dataType is invalid!"
    : UnresolvedRoute<
        Merge<
          Options,
          {
            dataTypes: [
              ...(Options extends { dataTypes: string[] }
                ? Options["dataTypes"]
                : []),
              ...$DataTypes,
            ];
            modifiedInitialContext: MarkOptional<
              Options extends { modifiedInitialContext: any }
                ? Options["modifiedInitialContext"]
                : never,
              keyof DefaultContext
            >;
          }
        >,
        SuccessContext,
        ErrorContext,
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
    SuccessContext,
    ErrorContext,
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
    SuccessContext,
    ErrorContext,
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
    SuccessContext,
    ErrorContext,
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
  >(
    fn: MiddlewareFunction<
      inferDataTypes<Options>,
      SuccessContext,
      NewContext,
      Method,
      inferParamsType<Params>,
      inferSingleSearchParamsType<SearchParams>,
      inferParserType<IBody>,
      inferParserTypeIfNever<OBody, any>,
      NewOData
    >,
  ): UnresolvedRoute<
    Options,
    Overwrite<SuccessContext, NewContext>,
    ErrorContext,
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
  >(
    fn: ErrorMiddlewareFunction<
      inferDataTypes<Options>,
      ErrorContext,
      NewContext,
      inferParserTypeIfNever<EBody, null>,
      NewEData
    >,
  ): UnresolvedRoute<
    Options,
    SuccessContext,
    Overwrite<ErrorContext, NewContext>,
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
    SuccessContext,
    ErrorContext,
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
    SuccessContext,
    ErrorContext,
    Method,
    Paths,
    Params,
    SearchParams,
    IBody,
    P,
    EBody
  >;

  method<M extends HTTPMethod, P extends Parser>(
    method: M,
    parser?: P,
  ): UnresolvedRoute<
    Options,
    SuccessContext,
    ErrorContext,
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
    SuccessContext,
    ErrorContext,
    "get",
    Paths,
    Params,
    SearchParams,
    IBody,
    OBody,
    EBody
  >;
  post<P extends Parser>(
    parser?: P,
  ): UnresolvedRoute<
    Options,
    SuccessContext,
    ErrorContext,
    "post",
    Paths,
    Params,
    SearchParams,
    P,
    OBody,
    EBody
  >;
  put<P extends Parser>(
    parser?: P,
  ): UnresolvedRoute<
    Options,
    SuccessContext,
    ErrorContext,
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
    SuccessContext,
    ErrorContext,
    "delete",
    Paths,
    Params,
    SearchParams,
    IBody,
    OBody,
    EBody
  >;
  patch<P extends Parser>(
    parser?: P,
  ): UnresolvedRoute<
    Options,
    SuccessContext,
    ErrorContext,
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
    SuccessContext,
    ErrorContext,
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

export type inferInitialRouteContext<R> = R extends Route<
  infer Options extends {
    initialContext: any;
  },
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
  ? Options["initialContext"]
  : never;

export type inferModifiedInitialRouteContext<R> = R extends Route<
  infer Options extends {
    modifiedInitialContext: any;
  },
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
  ? Options["modifiedInitialContext"]
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
