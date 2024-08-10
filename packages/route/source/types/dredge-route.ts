import type { Readable } from "stream";
import { MimeStore } from "dredge-common";
import type { ReadableStream } from "stream/web";
import { IsAny, IsNever, MarkOptional, Merge } from "ts-essentials";
import { Parser, ParserWithoutInput, inferParserType } from "../parser";
import { HTTPMethod } from "./http";
import { MaybePromise, Overwrite, Simplify } from "./utils";

export interface MiddlewareResult<C, Data> {
  ctx: C;
  headers: Record<string, string>; // Header names are lower-case
  status?: number;
  statusText?: string;

  data?: Data;
  dataType?: string;
  isEnd: boolean;
}

export interface NextMiddlewareResult<C, Data>
  extends MiddlewareResult<C, Data> {
  isEnd: false;
}
export interface EndMiddlewareResult<C, Data>
  extends MiddlewareResult<C, Data> {
  isEnd: true;
}

type Data<Types, T> =
  | { data: T }
  | (Types extends infer U
      ? U extends string
        ? { [P in U]: T }
        : never
      : never);

type OptionalData<Types, T> =
  | { data?: T }
  | (Types extends infer U
      ? U extends string
        ? { [P in U]?: T }
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
export type AnyErrorMiddlewareFunction = ErrorMiddlewareFunction<
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
      readonly dataType?: DataTypes;
      readonly data: IsNever<IData> extends true
        ? Method extends "get" | "delete" | "head"
          ? undefined
          : any
        : IData;
      header: {
        (headerName: string): string | undefined;
        (): Record<string, string>;
      };
      param: {
        (): Simplify<Params & Record<string, string>>;
        <T extends keyof Params>(
          key: T,
        ): Params extends { [key in T]: any } ? Params[T] : string | undefined;
        <T extends string>(key: T): string | undefined;
      };
      searchParam: {
        (): Simplify<SearchParams & Record<string, any>>;
        <T extends keyof SearchParams>(
          key: T,
        ): SearchParams extends { [key in T]: any } ? SearchParams[T] : any;
        <T extends string>(key: T): any;
      };
      searchParams: {
        (): Simplify<
          { [key in keyof SearchParams]: SearchParams[key][] } & Record<
            string,
            any[]
          >
        >;
        <T extends keyof SearchParams>(
          key: T,
        ): SearchParams extends { [key in T]: any } ? SearchParams[T][] : any[];
        <T extends string>(key: T): any[];
      };
    },
    res: {
      readonly ctx: Context;
      readonly status?: number;
      readonly statusText?: string;
      readonly data: any;
      readonly dataType?: DataTypes;
      header: {
        (): Record<string, string>;
        (headerName: string): string | undefined;
      };
      next: NextFunction<DataTypes>;
      end: OptionalEndFunction<
        DataTypes,
        IsNever<OData> extends true ? any : OData
      >;
    },
  ): MaybePromise<MiddlewareResult<NewContext, NewOData> | void>;
};

export type ErrorMiddlewareFunction<
  DataTypes,
  Context,
  NewContext,
  Method,
  EData,
  NewEData,
> = {
  (
    error: any,
    req: {
      readonly method: Method;
      readonly url: string;
      readonly data: Method extends "get" | "delete" | "head" ? undefined : any;
      readonly dataType?: DataTypes;

      param: {
        <T extends string>(key: T): string | undefined;
        (): Record<string, string>;
      };
      searchParam: {
        <T extends string>(key: T): any;
        (): Record<string, any>;
      };
      searchParams: {
        <T extends string>(key: T): any[];
        (): Record<string, any[]>;
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
      readonly data: any;
      readonly dataType?: DataTypes;

      header: {
        (): Record<string, string>;
        (headerName: string): string | undefined;
      };
      next: NextFunction<DataTypes>;
      end: OptionalEndFunction<
        DataTypes,
        IsNever<EData> extends true ? any : EData
      >;
    },
  ): MaybePromise<MiddlewareResult<NewContext, NewEData> | void>;
};

type NextFunction<DataTypes> = {
  (): MiddlewareResult<{}, never>;

  <$ContextOverride>(
    opts: OptionalData<DataTypes, any> & {
      dataType?: DataTypes;
      ctx?: $ContextOverride;
      headers?: Record<string, string | null>;
      status?: number;
      statusText?: string;
    },
  ): MiddlewareResult<$ContextOverride, never>;
};

type OptionalEndFunction<DataTypes, DT = any> = {
  (): MiddlewareResult<{}, any>;

  <T extends DT>(
    opts: OptionalData<DataTypes, T> & {
      dataType?: DataTypes;
      headers?: Record<string, string | null>;
      status?: number;
      statusText?: string;
    },
  ): MiddlewareResult<{}, T>;
};

type EndFunction<DataTypes, DT> = {
  (): MiddlewareResult<{}, any>;

  <T extends DT>(
    opts: Data<DataTypes, T> & {
      dataType?: DataTypes;
      headers?: Record<string, string | null>;
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
  dataTypes: Record<string, string>;
  defaultContext?: any;
  dataTransformer: Record<
    string,
    {
      forRequest?: (data: any) => any;
      forResponse?: (data: any) => any;
    }
  >;
  dataSerializers: MimeStore<DataSerializerFunction>;
  bodyParsers: MimeStore<BodyParserFunction>;

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
  errorMiddlewares: ErrorMiddlewareFunction<any, any, any, any, any, any>[];
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
  | "url"
  | "method"
  | "headers"
  | "body"
  | "baseUrl"
  | "status"
  | "statusText"
  | "data"
  | "params"
  | "param"
  | "searchParams"
  | "searchParam"
  | "get"
  | "post"
  | "put"
  | "delete"
  | "patch"
  | "head"
  | "dataType"
  | "responseDataType"
  | "context"
  | "ctx";

type IsNotAllowedDataTypes<T> = (
  keyof T extends infer U
    ? U extends string
      ? U extends NotAllowedDataShortcuts
        ? true
        : false
      : false
    : false
) extends false
  ? false
  : true;

type inferSearchParamType<SearchParams> = Simplify<{
  [key in keyof SearchParams]: inferParserType<SearchParams[key]>;
}>;

export type BodyAs =
  | "text"
  | "Buffer"
  | "ReadableStream"
  | "stream.Readable"
  | "Blob"
  | "FormData"
  | "ArrayBuffer";

export type BodyTypesMap = {
  null: null;
  text: string;
  Buffer: Buffer;
  ReadableStream: ReadableStream;
  "stream.Readable": Readable;
  Blob: Blob;
  FormData: FormData;
  ArrayBuffer: ArrayBuffer;
};
export type BodyTypes =
  | null
  | string
  | Buffer
  | ReadableStream
  | Readable
  | Blob
  | FormData
  | ArrayBuffer;

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type
type DataSerializerFunction = (options: {
  readonly data: any;
  readonly mediaType?: string;
  boundary?: string;
  charset?: string;
}) => Promise<BodyTypes> | BodyTypes;

type BodyParserFunction = (options: {
  readonly body: BodyFn;
  readonly mediaType?: string;
  readonly boundary?: string;
  readonly charset?: string;
}) => Promise<any>;

export type BodyFn = {
  (): Promise<
    | null
    | string
    | Buffer
    | ReadableStream
    | Readable
    | Blob
    | FormData
    | ArrayBuffer
  >;
  <As extends BodyAs>(as: As): Promise<BodyTypesMap[As]>;
};

export interface UnresolvedRoute<
  Options,
  SuccessContext,
  ErrorContext,
  Method = never,
  Paths = [],
  Params = {},
  SearchParams = {},
  IBody = never,
  OBody = never,
  EBody = never,
> {
  _def: RouteBuilderDef<false>;

  options<
    const DataTypes extends Record<string, string> = {},
    const DefaultContext extends Partial<
      Options extends { initialContext: any } ? Options["initialContext"] : {}
    > = {},
  >(options?: {
    dataTypes?: DataTypes;
    dataTransformer?: {
      [key in keyof inferDataTypes<Options> | keyof DataTypes]?: {
        forRequest?: (data: any) => any;
        forResponse?: (data: any) => any;
      };
    };
    dataSerializers?: {
      mediaType?: string | string[];
      dataType?:
        | (inferDataTypes<Options> | keyof DataTypes)
        | (inferDataTypes<Options> | keyof DataTypes)[];
      fn: DataSerializerFunction;
    }[];
    bodyParsers?: {
      mediaType?: string | string[];
      dataType?:
        | (inferDataTypes<Options> | keyof DataTypes)
        | (inferDataTypes<Options> | keyof DataTypes)[];
      fn: BodyParserFunction;
    }[];
    defaultContext?: DefaultContext;
  }): IsNotAllowedDataTypes<DataTypes> extends true
    ? "One or more of dataType is invalid!"
    : UnresolvedRoute<
        Merge<
          Options,
          {
            dataTypes: Merge<
              DataTypes,
              Options extends { dataTypes: any } ? Options["dataTypes"] : {}
            >;
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
        Params,
        SearchParams,
        IBody,
        OBody,
        EBody
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
        : never]: never;
    },
    SearchParams,
    IBody,
    OBody,
    EBody
  >;

  params<
    const T extends {
      [key in keyof Params as IsNever<Params[key]> extends true
        ? key
        : never]?: Parser;
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

  use<NewContext = {}, NewOData = never>(
    fn: MiddlewareFunction<
      inferDataTypes<Options>,
      SuccessContext,
      NewContext,
      IsNever<Method> extends true ? string : Method,
      inferParamsType<Params>,
      inferSearchParamType<SearchParams>,
      inferParserType<IBody>,
      inferParserType<OBody>,
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
    IsNever<NewOData> extends true
      ? OBody
      : IsNever<OBody> extends true
        ? ParserWithoutInput<NewOData>
        : OBody,
    EBody
  >;

  error<NewContext = {}, NewEData = never>(
    fn: ErrorMiddlewareFunction<
      inferDataTypes<Options>,
      ErrorContext,
      NewContext,
      IsNever<Method> extends true ? string : Method,
      inferParserType<EBody>,
      NewEData
    >,
  ): UnresolvedRoute<
    Options,
    SuccessContext,
    Overwrite<ErrorContext, NewContext>,
    Method,
    Paths,
    Params,
    SearchParams,
    IBody,
    OBody,
    IsNever<NewEData> extends true
      ? EBody
      : IsNever<EBody> extends true
        ? ParserWithoutInput<NewEData>
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
    IsNever<OBody> extends true ? ParserWithoutInput<any> : OBody,
    IsNever<EBody> extends true ? ParserWithoutInput<any> : EBody
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

export interface AnyRouteOptions {
  initialContext: any;
  modifiedInitialContext: any;
  dataTypes: {
    [key: string]: string;
  };
}

type inferParamsType<Params> = Simplify<{
  [key in keyof Params]: Params[key] extends null
    ? string
    : inferParserType<Params[key]>;
}>;

export type inferDataTypes<Options> = Options extends {
  dataTypes?: any;
}
  ? keyof Options["dataTypes"]
  : never;
