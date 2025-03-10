import type { Readable } from "stream";
import type { ReadableStream } from "stream/web";
import { Parser, ParserWithoutInput, inferParserType } from "../parser";
import {
  IsAny,
  IsNever,
  MaybePromise,
  Merge,
  Overwrite,
  Simplify,
} from "../utils";
import { HTTPMethod } from "./http";

export type RouteD<DataType extends string, Context, Data> = {
  res<D extends Data>(resUpdate: {
    status?: number;
    statusText?: string;
    data?: D;
    dataType?: DataType;
    headers?: Record<string, string | null>;
  }): RouteD<DataType, Context, Data>;
  req(reqUpdate: {
    url?: string;
    method?: string;
    dataType?: string;
    data?: any;
    params?: Record<string, any | any[]>;
    headers?: Record<string, string | null>;
  }): RouteD<DataType, Context, Data>;
  status(number: number, text?: string): RouteD<DataType, Context, Data>;
  data<D extends Data>(data: D): RouteD<DataType, Context, D>;
  dataType(type: DataType): RouteD<DataType, Context, Data>;
  state<State extends Record<string, any>>(
    state: State,
  ): RouteD<DataType, Overwrite<Context, State>, Data>;
  header(
    headerName: string,
    value: string | null,
  ): RouteD<DataType, Context, Data>;
  header(
    headers: Record<string, string | null>,
  ): RouteD<DataType, Context, Data>;
  next(): Promise<RouteD<DataType, Context, Data>>;
} & {
  [key in DataType]: <D extends Data>(data: D) => RouteD<DataType, Context, D>;
};

export type isAnyRoute<R> = R extends Route<
  infer _Options,
  infer SuccessContext,
  infer ErrorContext,
  infer Method,
  infer Paths,
  infer Params,
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
      | IsAny<IBody>
      | IsAny<OBody>
      | IsAny<EBody> extends true
    ? true
    : false
  : false;

export type MiddlewareContext<DataType, State, Method, Params, IData> = {
  error: any;
  req: MiddlewareRequest<DataType, Method, Params, IData>;
  res: MiddlewareResponse<DataType, any>;
  state: State;
};

export interface MiddlewareRequest<DataType, Method, Params, Data> {
  readonly url: string;
  readonly method: Method;
  readonly dataType?: DataType;
  readonly data: Method extends "get" | "delete" | "head" ? undefined : Data;
  readonly headers: Record<string, string>;
  readonly params: Params;
}

export interface MiddlewareResponse<DataType, Data = any> {
  readonly status?: number;
  readonly statusText?: string;
  readonly dataType?: DataType;
  readonly data: Data;
  readonly headers: Record<string, string>;
}

export interface AnyMiddlewareRequest
  extends MiddlewareRequest<any, string, Record<string, any>, any> {}

export interface AnyMiddlewareResponse extends MiddlewareResponse<any, any> {}

export type AnyMiddlewareFunction = MiddlewareFunction<
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
  DataType,
  Context,
  NewContext,
  Method,
  Params,
  IData,
  OData,
  NewOData,
> = {
  (
    c: MiddlewareContext<
      DataType,
      Context,
      Method,
      Params,
      IsNever<IData> extends true ? any : IData
    >,
    d: RouteD<
      DataType extends string ? DataType : never,
      Context,
      IsNever<OData> extends true ? any : OData
    >,
  ): MaybePromise<RouteD<
    DataType extends string ? DataType : never,
    NewContext,
    NewOData
  > | void>;
};

export type ErrorMiddlewareFunction<
  DataType,
  Context,
  NewContext,
  Method,
  EData,
  NewEData,
> = {
  (
    c: MiddlewareContext<
      DataType extends string ? DataType : never,
      Context,
      Method,
      Record<string, any>,
      any
    >,
    d: RouteD<
      DataType extends string ? DataType : never,
      Context,
      IsNever<EData> extends true ? any : EData
    >,
  ): MaybePromise<RouteD<
    DataType extends string ? DataType : never,
    NewContext,
    NewEData
  > | void>;
};

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

export type NotAllowedDataShortcuts =
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
  | "query"
  | "queries"
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

export type IsNotAllowedDataTypes<T> = (
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

export interface RawRequest {
  url: string;
  method: string;
  dataType?: string;
  data?: any;
  headers: Record<string, string>;
  params: Record<string, any>;
}

export interface RawResponse {
  status?: number;
  statusText?: string;
  dataType?: string;
  data?: any;
  headers: Record<string, string>;
}

export interface DredgeRouteSchema {
  method: string | null;
  paths: string[];
  params: Record<string, any | null>;
  input: any | null;
  output: any | null;
}

export interface Route<
  Options,
  SuccessContext,
  ErrorContext,
  Method = never,
  Paths = [],
  Params = {},
  IBody = never,
  OBody = never,
  EBody = never,
> {
  _schema: DredgeRouteSchema;

  _handle(context: {
    request: RawRequest;
    error?: any;
    response?: RawResponse;
    state?: any;
  }): Promise<RawResponse>;

  options<const DataTypes extends Record<string, string> = {}>(options: {
    dataTypes?: DataTypes;
  }): Route<
    Merge<
      Options,
      {
        dataTypes: Merge<
          DataTypes,
          Options extends { dataTypes: any } ? Options["dataTypes"] : {}
        >;
      }
    >,
    SuccessContext,
    ErrorContext,
    Method,
    Paths,
    Params,
    IBody,
    OBody,
    EBody
  >;

  path<const T extends string, A extends string[] = inferPathArray<T>>(
    path: T,
  ): Route<
    Options,
    SuccessContext,
    ErrorContext,
    Method,
    Paths extends Array<string> ? [...Paths, ...A] : A,
    Merge<
      {
        [key in A[number] as key extends `:${infer N}` ? N : never]: never;
      },
      Params
    >,
    IBody,
    OBody,
    EBody
  >;

  params<const T extends Record<string, Parser>>(
    arg: T,
  ): Route<
    Options,
    SuccessContext,
    ErrorContext,
    Method,
    Paths,
    Merge<Params, T>,
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
      inferParserType<IBody>,
      inferParserType<OBody>,
      NewOData
    >,
  ): Route<
    Options,
    Overwrite<SuccessContext, NewContext>,
    ErrorContext,
    Method,
    Paths,
    Params,
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
  ): Route<
    Options,
    SuccessContext,
    Overwrite<ErrorContext, NewContext>,
    Method,
    Paths,
    Params,
    IBody,
    OBody,
    IsNever<NewEData> extends true
      ? EBody
      : IsNever<EBody> extends true
        ? ParserWithoutInput<NewEData>
        : EBody
  >;

  output<P extends Parser>(
    parser: P,
  ): Route<
    Options,
    SuccessContext,
    ErrorContext,
    Method,
    Paths,
    Params,
    IBody,
    P,
    EBody
  >;

  input<P extends Parser>(
    parser: P,
  ): Route<
    Options,
    SuccessContext,
    ErrorContext,
    Method,
    Paths,
    Params,
    P,
    OBody,
    EBody
  >;

  method<M extends HTTPMethod>(
    method: M,
  ): Route<
    Options,
    SuccessContext,
    ErrorContext,
    M,
    Paths,
    Params,
    IBody,
    OBody,
    EBody
  >;
  get(): Route<
    Options,
    SuccessContext,
    ErrorContext,
    "get",
    Paths,
    Params,
    IBody,
    OBody,
    EBody
  >;
  post(): Route<
    Options,
    SuccessContext,
    ErrorContext,
    "post",
    Paths,
    Params,
    IBody,
    OBody,
    EBody
  >;
  put(): Route<
    Options,
    SuccessContext,
    ErrorContext,
    "put",
    Paths,
    Params,
    IBody,
    OBody,
    EBody
  >;
  delete(): Route<
    Options,
    SuccessContext,
    ErrorContext,
    "delete",
    Paths,
    Params,
    IBody,
    OBody,
    EBody
  >;
  patch(): Route<
    Options,
    SuccessContext,
    ErrorContext,
    "patch",
    Paths,
    Params,
    IBody,
    OBody,
    EBody
  >;
  head(): Route<
    Options,
    SuccessContext,
    ErrorContext,
    "head",
    Paths,
    Params,
    IBody,
    OBody,
    EBody
  >;
}

export type AnyRoute = Route<any, any, any, any, any, any, any, any, any>;

export type AnyValidRoute = Route<
  any,
  any,
  any,
  string,
  string[],
  any,
  any,
  any,
  any
>;

export interface AnyRouteOptions {
  initialContext: any;
  dataTypes: {
    [key: string]: string;
  };
  withDynamicPath: boolean;
}

type inferParamsType<Params> = Simplify<{
  [key in keyof Params]: IsNever<Params[key]> extends true
    ? any
    : inferParserType<Params[key]>;
}>;

export type inferDataTypes<Options> = Options extends {
  dataTypes?: any;
}
  ? keyof Options["dataTypes"]
  : never;
