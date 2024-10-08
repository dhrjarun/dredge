import { Parser, inferParserType } from "../parser";
import {
  AnyRoute,
  AnyRouteOptions,
  Data,
  HTTPMethod,
  Route,
  inferModifiedInitialRouteContext,
  inferParamsType,
  inferRouteDataTypes,
  inferSearchParamsType,
} from "../route";
import { IsNever, Merge, RequiredKeys } from "../utils";

interface DataTransformer {
  forRequest?: (data: any) => any;
  forResponse?: (data: any) => any;
}

export interface DredgeClientOptions {
  method?: HTTPMethod;
  data?: any;
  dataType?: string;
  dataTypes?: Record<string, string>;
  responseDataType?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  searchParams?: Record<string, any | any[]>;
  prefixUrl?: URL | string;
  throwHttpErrors?: boolean;
  dataTransformer?: {
    [dataType: string]: DataTransformer;
  };
}

export type inferDredgeClientOption<
  R,
  Options = DredgeClientOptions,
> = R extends Route<
  infer RouteOptions extends AnyRouteOptions,
  any,
  any,
  infer Method,
  any,
  infer Params,
  infer SearchParams,
  infer IBody,
  any,
  any
>
  ? Merge<
      Omit<Options, "data">,
      {
        method: Method;
        dataType?: keyof RouteOptions["dataTypes"];
        responseDataType?: keyof RouteOptions["dataTypes"];
        dataTypes?: {
          [key in keyof RouteOptions["dataTypes"]]?: string;
        };
        dataTransformer?: {
          [key in keyof RouteOptions["dataTypes"]]?: DataTransformer;
        };
      } & ("serverCtx" extends keyof Options
        ? { serverCtx?: RouteOptions["initialContext"] }
        : {}) &
        ([Method] extends ["post" | "put" | "patch"]
          ? IBody extends Parser
            ? Data<keyof RouteOptions["dataTypes"], inferParserType<IBody>>
            : {}
          : {}) &
        (IsNever<keyof SearchParams> extends true
          ? {}
          : IsNever<
                RequiredKeys<inferSearchParamsType<SearchParams>>
              > extends true
            ? { searchParams?: inferSearchParamsType<SearchParams> }
            : { searchParams: inferSearchParamsType<SearchParams> }) &
        (IsNever<keyof Params> extends true
          ? {}
          : { params: inferParamsType<Params> })
    >
  : Options;

export type _inferDredgeClientOption<
  R,
  Options = DredgeClientOptions,
> = IsNever<R> extends true ? Options : inferDredgeClientOption<R, Options>;

export type DefaultFieldInDirectClientOptions =
  | "headers"
  | "throwHttpErrors"
  | "prefixUrl"
  | "dataTypes"
  | "dataType"
  | "dataTransformer"
  | "responseDataType";

export type DefaultDredgeClientOptions = Pick<
  DredgeClientOptions,
  DefaultFieldInDirectClientOptions
>;

export type inferRouteArrayContext<Routes, Context = {}> = Routes extends [
  infer First extends AnyRoute,
  ...infer Tail extends AnyRoute[],
]
  ? inferRouteArrayContext<
      Tail,
      Context & inferModifiedInitialRouteContext<First>
    >
  : Context;

export type inferDefaultDredgeClientOptions<
  Routes,
  DefaultOptions = DefaultDredgeClientOptions,
  DT = Routes extends any[] ? inferRouteDataTypes<Routes[number]> : never,
> = Merge<
  DefaultOptions,
  {
    dataType?: keyof DT;
    responseDataType?: keyof DT;
    dataTypes?: {
      [key in keyof DT]?: string;
    };
    dataTransformer?: {
      [key in keyof DT]?: DataTransformer;
    };
  } & ("serverCtx" extends keyof DefaultOptions
    ? { serverCtx?: inferRouteArrayContext<Routes> }
    : {})
>;
