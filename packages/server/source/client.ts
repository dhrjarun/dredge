import { inferPathType, inferSearchParamsType, AnyRoute, Route } from "./route";
import { HTTPMethod } from "@dredge/common";
import { Parser, inferParserType } from "./parser";
import { DredgeApi, DredgePath, executeRoute } from "./api";
import { MaybePromise, Simplify } from "./types";

export type inferRoutes<Api> = Api extends DredgeApi<
  infer Routes extends AnyRoute[]
>
  ? Routes
  : never;
export type inferRouteUnion<Api> = inferRoutes<Api>[number];

export type ExtractRoute<
  R,
  Method extends HTTPMethod,
  Path extends string = any
> = R extends Route<
  any,
  infer M,
  infer PathArray,
  infer Params extends Record<string, Parser>,
  any,
  any,
  any
>
  ? [Method, Path] extends [M, inferPathType<PathArray, Params>]
    ? R
    : never
  : never;

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

// TODO:
// AnyClientOptions
// refactor
export type ClientOptions<R> = R extends Route<
  any,
  infer Method,
  infer Path,
  any,
  infer SearchParams extends Record<string, Parser>,
  infer IBody
>
  ? {
      headers?: Record<string, string | string[] | undefined>;
      method: Method;
      path: inferPathType<Path, SearchParams>;
    } & (Method extends "get" | "delete"
      ? {}
      : { body: inferParserType<IBody> }) &
      (keyof SearchParams extends never
        ? {}
        : { searchParams: inferSearchParamsType<SearchParams> })
  : never;

type ClientResult<R> = R extends Route<
  any,
  any,
  any,
  any,
  any,
  any,
  infer OBody
>
  ? {
      parsed: () => Promise<inferParserType<OBody>>;
    } & Promise<{
      body: OBody extends Parser ? inferParserType<OBody> : unknown;
      headers: Record<string, string>;
      status: number;
      statusText: string;
    }>
  : never;

type DredgeClientMethod<Api, Method extends HTTPMethod> = <
  P extends ClientPath<ExtractRoute<inferRouteUnion<Api>, Method>>,
  R extends ExtractRoute<inferRouteUnion<Api>, Method, P>
>(
  path: P,
  options: Simplify<Omit<ClientOptions<R>, "method" | "path">>
) => ClientResult<R>;

interface DredgeClient<Api extends DredgeApi<any>> {
  <
    P extends ClientPath<inferRouteUnion<Api>>,
    M extends RouteMethod<ExtractRoute<inferRouteUnion<Api>, any, P>>,
    R extends ExtractRoute<inferRouteUnion<Api>, M, P>
  >(
    path: P,
    options: Simplify<{ method: M } & Omit<ClientOptions<R>, "path" | "method">>
  ): ClientResult<R>;

  get: DredgeClientMethod<Api, "get">;
  post: DredgeClientMethod<Api, "post">;
  put: DredgeClientMethod<Api, "put">;
  delete: DredgeClientMethod<Api, "delete">;
  patch: DredgeClientMethod<Api, "patch">;
  head: DredgeClientMethod<Api, "head">;
}

export function buildDirectClient<T>(
  api: DredgeApi<T>,
  options: { ctx?: object } = {}
) {
  const { ctx = {} } = options;
  const root = api._root;

  const client = ((path, options) => {
    const result = executeRoute(root, ctx, {
      ...options,
      path,
    });

    const response = result as ClientResult<any>;

    response.parsed = () => {
      return new Promise((resolve, reject) => {
        result
          .then((re) => {
            resolve(re.body);
          })
          .catch((err) => {
            reject(err);
          });
      });
    };

    return response;
  }) as DredgeClient<DredgeApi<T>>;

  const aliases = ["get", "post", "put", "patch", "head", "delete"] as const;

  for (const method of aliases) {
    client[method] = (path: string, options) =>
      client(path as any, { ...options, method }) as any;
  }

  return client;
}

export type RouteMethod<R> = R extends Route<
  any,
  infer Method extends HTTPMethod,
  any,
  any,
  any,
  any
>
  ? Method
  : never;

type RouteMethodWhere<R, P extends string[]> = R extends Route<
  R,
  infer Method extends string,
  P,
  any,
  any,
  any
>
  ? R
  : never;

type RoutePath<R> = R extends Route<any, any, infer Path, any, any>
  ? Path
  : never;

type RouteParams<R> = R extends Route<
  any,
  any,
  any,
  infer Params extends Record<string, Parser>,
  any,
  any
>
  ? Params
  : never;
type RouteSearchParams<R> = R extends Route<
  any,
  any,
  any,
  any,
  infer SearchParams,
  any
>
  ? SearchParams
  : never;
