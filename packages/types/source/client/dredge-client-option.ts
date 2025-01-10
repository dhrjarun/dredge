import { inferParserType } from "../parser";
import {
  AnyRoute,
  AnyRouteOptions,
  Data,
  HTTPMethod,
  Route,
  inferModifiedInitialRouteContext,
  inferClientParamsType,
  inferRouteDataTypes,
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
  params?: Record<string, any | any[]>;
  prefixUrl?: URL | string;
  throwHttpErrors?: boolean;
}

export type inferDredgeClientOption<
  R,
  ParamTypes extends ":" | "?" = ":" | "?",
  Options = DredgeClientOptions,
> = R extends Route<
  infer RouteOptions extends AnyRouteOptions,
  any,
  any,
  infer Method,
  any,
  infer Params,
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
      } & ("serverCtx" extends keyof Options
        ? { serverCtx?: RouteOptions["initialContext"] }
        : {}) &
        Data<keyof RouteOptions["dataTypes"], inferParserType<IBody>> &
        (IsNever<keyof Params> extends true
          ? {}
          : IsNever<
                RequiredKeys<inferClientParamsType<Params, ParamTypes>>
              > extends true
            ? { params?: inferClientParamsType<Params, ParamTypes> }
            : { params: inferClientParamsType<Params, ParamTypes> })
    >
  : Options;

export type _inferDredgeClientOption<
  R,
  ParamTypes extends ":" | "?" = ":" | "?",
  Options = DredgeClientOptions,
> = IsNever<R> extends true
  ? Options
  : inferDredgeClientOption<R, ParamTypes, Options>;

export type DefaultFieldInDirectClientOptions =
  | "headers"
  | "throwHttpErrors"
  | "prefixUrl"
  | "dataTypes"
  | "dataType"
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
