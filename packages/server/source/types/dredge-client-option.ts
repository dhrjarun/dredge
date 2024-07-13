import {
  AnyRoute,
  AnyRouteOptions,
  HTTPMethod,
  Parser,
  Route,
  inferModifiedInitialRouteContext,
  inferParserType,
  inferRouteDataTypes,
  inferSearchParamsType,
} from "@dredge/common";
import { IsNever, Merge, RequiredKeys } from "ts-essentials";
import { Data } from "./route-data";
import { inferParamsType } from "./route-parameters";

export interface DredgeClientOptions {
  ctx?: Record<string, any>;
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
}

export type inferDredgeClientOption<R> = R extends Route<
  infer Options extends AnyRouteOptions,
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
  ? Omit<
      DredgeClientOptions,
      | "method"
      | "searchParams"
      | "data"
      | "ctx"
      | "dataType"
      | "responseDataType"
      | "dataTypes"
    > & {
      method: Method;
      ctx?: Options["modifiedInitialContext"];
      dataType?: keyof Options["dataTypes"];
      responseDataTypes?: keyof Options["dataTypes"];
      dataTypes?: {
        [key in keyof Options["dataTypes"]]?: string;
      };
    } & ([Method] extends ["post" | "put" | "patch"]
        ? IBody extends Parser
          ? Data<keyof Options["dataTypes"], inferParserType<IBody>>
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
  : DredgeClientOptions;

export type _inferDredgeClientOption<R> = IsNever<R> extends true
  ? DredgeClientOptions
  : inferDredgeClientOption<R>;

export type DefaultDredgeClientOptions = Pick<
  DredgeClientOptions,
  | "ctx"
  | "headers"
  | "throwHttpErrors"
  | "prefixUrl"
  | "dataTypes"
  | "dataType"
  | "responseDataType"
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
  DT = Routes extends any[] ? inferRouteDataTypes<Routes[number]> : never,
> = Merge<
  DefaultDredgeClientOptions,
  {
    ctx?: inferRouteArrayContext<Routes>;
    dataType?: keyof DT;
    responseDataType?: keyof DT;
    dataTypes?: {
      [key in keyof DT]?: string;
    };
  }
>;
