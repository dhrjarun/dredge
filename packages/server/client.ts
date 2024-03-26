import {
  inferPathType,
  inferSearchParamsType,
  AnyRoute,
  Route,
  ResolverResult,
  HTTPMethod,
} from "./route";
import { Parser, getParseFn, inferParserType } from "./parser";
import { DredgeApi, DredgePath } from "./api";
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
type ClientOptions<R> = R extends Route<
  any,
  infer Method,
  infer Path,
  any,
  infer SearchParams extends Record<string, Parser>,
  infer IBody
>
  ? {
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

  // get<
  //   R extends ExtractRouteBy<inferRoutes<Api>[number], "get">,
  //   P extends RoutePath<R>
  // >(
  //   path: inferPathType<P, RouteParams<R>>,
  //   options: Omit<
  //     ClientOptions<ExtractRouteBy<R, any, P>>,
  //     "method" | "path" | "body"
  //   >
  // );

  // get<
  //   P extends ClientPath<ExtractRoute<inferRouteUnion<Api>, "get">>,
  //   R extends ExtractRoute<inferRouteUnion<Api>, "get", P>
  // >(
  //   path: P,
  //   options: Omit<ClientOptions<R>, "method" | "path">
  // ): ClientResult<R>;

  get: DredgeClientMethod<Api, "get">;
  post: DredgeClientMethod<Api, "post">;
  put: DredgeClientMethod<Api, "put">;
  delete: DredgeClientMethod<Api, "delete">;
  patch: DredgeClientMethod<Api, "patch">;
  head: DredgeClientMethod<Api, "head">;

  // post<
  //   P extends ClientPath<
  //     ExtractRouteByMethod<inferRoutes<Api>[number], "post">
  //   >,
  //   R extends ExtractRoute<inferRoutes<Api>[number], "post", P>
  // >(
  //   path: P,
  //   options: Omit<ClientOptions<R>, "method" | "path">
  // ): ClientResult<R>;
  // post<
  //   R extends ExtractRouteBy<inferRoutes<Api>[number], "post">,
  //   P extends RoutePath<R>
  // >(
  //   path: inferPathType<P, RouteParams<R>>,
  //   options: Omit<ClientOptions<ExtractRouteBy<R, any, P>>, "method" | "path">
  // );
}

// TODO
// ctx mergeDeep
export function buildDirectClient<T>(
  api: DredgeApi<T>,
  options: { ctx?: object } = {}
) {
  const { ctx = {} } = options;
  const root = api._root;

  async function executeRoute(
    root: DredgePath,
    clientOptions: ClientOptions<AnyRoute>
  ) {
    const { path, searchParams, body, method } = clientOptions;
    const pathArray = path.split("/").slice(1);

    let current = root;
    pathArray.forEach((item, index) => {
      const child = current.getStaticChild(item) || current.getDynamicChild();

      if (!child) {
        throw "Invalid path";
      }

      current = child;
    });

    const routeDef = current.getRoute(method)!._def;
    if (!routeDef) {
      throw "Invalid path, no route exist";
    }

    const params: Record<string, string> = routeDef.paths.reduce(
      (acc, item, index) => {
        if (item.startsWith(":")) {
          acc[item.replace(":", "")] = pathArray[index];
        }
        return acc;
      },
      {}
    );
    const parsedSearchParams = {};
    const parsedParams = {};
    let parsedBody: unknown;
    let currentCtx: any = {
      ...ctx,
    };
    let resolverResult: MaybePromise<ResolverResult<any>>;

    let step:
      | "PARAM_VALIDATION"
      | "SEARCH_PARAM_VALIDATION"
      | "BODY_VALIDATION"
      | "MIDDLEWARE_CALLS"
      | "RESOLVER_CALL"
      | "DONE" = "PARAM_VALIDATION";

    while (step != "DONE") {
      try {
        switch (step) {
          case "PARAM_VALIDATION":
            for (const [index, item] of routeDef.paths.entries()) {
              if (item.startsWith(":")) {
                const parser = routeDef.params[item.replace(":", "")];
                parsedParams[item] =
                  (await getParseFn(parser)(pathArray[index])) ||
                  pathArray[index];
              }
            }

            step = "SEARCH_PARAM_VALIDATION";
            break;
          case "SEARCH_PARAM_VALIDATION":
            for (const [key, parser] of Object.entries(routeDef.searchParams)) {
              parsedSearchParams[key] = await getParseFn(parser)(
                searchParams[key]
              );
            }

            step = "BODY_VALIDATION";
            break;
          case "BODY_VALIDATION":
            if (routeDef.iBody) {
              parsedBody = await getParseFn(routeDef.iBody)(body);
            }

            step = "MIDDLEWARE_CALLS";
            break;
          case "MIDDLEWARE_CALLS":
            routeDef.middlewares.forEach(async (fn) => {
              const middlewareResult = await fn({
                method,
                ctx: currentCtx,
                params: parsedParams,
                searchParams: parsedSearchParams,
                path: pathArray.join("/"),
                body: parsedBody,
                next(nextOptions?: any) {
                  return {
                    ctx: {
                      ...currentCtx,
                      ...nextOptions?.ctx,
                    },
                  };
                },
              });

              currentCtx = middlewareResult.ctx;
            });

            step = "RESOLVER_CALL";
            break;
          case "RESOLVER_CALL":
            if (!routeDef.resolver) {
              throw "No resolver exist";
            }
            resolverResult = routeDef.resolver({
              method,
              ctx: currentCtx,
              params: parsedParams,
              searchParams: parsedSearchParams,
              path: pathArray.join("/"),
              body: parsedBody,
              send(resolverOptions?: any) {
                return resolverOptions;
              },
            });

            step = "DONE";
            break;
        }
      } catch (error) {
        resolverResult = routeDef.errorResolver?.({
          error,
          errorOrigin: step,
          ...clientOptions,
          params,
          method,
          send(resolverOptions?: any) {
            return resolverOptions;
          },
        })!;

        step = "DONE";
      }
    }

    return resolverResult!;
  }

  const client = ((path, options) => {
    const result = executeRoute(root, {
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
