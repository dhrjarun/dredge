import {
  inferPathType,
  inferSearchParamsType,
  Route,
  ExtractRoute,
  AnyRoute,
} from "./route";
import { Parser, inferParserType } from "../parser";
import { Simplify } from "./utils";
import { HTTPMethod, ResponsePromise } from "./http";
import { Transformer } from "../transformer";

export type ClientPath<R> = R extends Route<
  any,
  any,
  infer Path,
  infer Params extends Record<string, Parser>,
  any,
  any
>
  ? inferPathType<Path, Params>
  : never;

export type DredgeClientOptions<R> = R extends Route<
  any,
  infer Method,
  infer Path,
  any,
  infer SearchParams extends Record<string, Parser>,
  infer IBody
>
  ? {
      // headers?: Record<string, string | string[] | undefined>;
      headers?: Record<string, string>;
      method: Method;
      path: inferPathType<Path, SearchParams>;
    } & (Method extends "get" | "delete"
      ? {}
      : { data: inferParserType<IBody> }) &
      (keyof SearchParams extends never
        ? {}
        : { searchParams: inferSearchParamsType<SearchParams> })
  : never;

export type AnyDredgeClientOptions = {
  headers?: Record<string, string>;
  method: HTTPMethod | string;
  path: string;
  data?: any;
  searchParams?: Record<string, any>;
};

export type ClientOptions = {
  headers?: Record<string, string>;
  method: HTTPMethod | string;
  path: string;
  data?: any;
  searchParams?: Record<string, any>;
  transformer?: Partial<Transformer>;
  prefixUrl?: URL | string;
  fetch?: (
    input: string | URL | globalThis.Request,
    init?: RequestInit
  ) => Promise<Response>;
};

export type DredgeResponse<R> = R extends Route<
  any,
  any,
  any,
  any,
  any,
  any,
  infer OBody
>
  ? ResponsePromise<OBody extends Parser ? inferParserType<OBody> : unknown>
  : never;

type DredgeClientFunction<
  Routes extends AnyRoute[],
  Method extends HTTPMethod
> = <
  P extends ClientPath<ExtractRoute<Routes[number], Method>>,
  R extends ExtractRoute<Routes[number], Method, P>
>(
  path: P,
  options: Simplify<Omit<DredgeClientOptions<R>, "method" | "path">>
) => DredgeResponse<R>;

export interface DredgeClient<Routes extends AnyRoute[]> {
  <
    P extends ClientPath<Routes[number]>,
    M extends RouteMethod<ExtractRoute<Routes[number], any, P>>,
    R extends ExtractRoute<Routes[number], M, P>
  >(
    path: P,
    options: Simplify<
      { method: M } & Omit<DredgeClientOptions<R>, "path" | "method">
    >
  ): DredgeResponse<R>;

  get: DredgeClientFunction<Routes, "get">;
  post: DredgeClientFunction<Routes, "post">;
  put: DredgeClientFunction<Routes, "put">;
  delete: DredgeClientFunction<Routes, "delete">;
  patch: DredgeClientFunction<Routes, "patch">;
  head: DredgeClientFunction<Routes, "head">;
}

type RouteMethod<R> = R extends Route<
  any,
  infer Method extends HTTPMethod,
  any,
  any,
  any,
  any
>
  ? Method
  : never;
