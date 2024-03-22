import {
  inferPathType,
  inferSearchParamsType,
  AnyRoute,
  Route,
  ResolverResult,
} from "./route";
import { Parser, getParseFn, inferParserType } from "./parser";
import { DredgeApi, DredgePath } from "./api";
import { MaybePromise } from "./types";

export type inferRoutes<Api> = Api extends DredgeApi<
  infer Routes extends AnyRoute[]
>
  ? Routes
  : never;

type ExtractRouteByMethod<R, Method extends string> = Extract<
  R,
  Route<any, Method, any, any, any, any>
>;
export type ExtractRouteByPath<R, Path extends string> = R extends Route<
  any,
  any,
  infer PathArray,
  infer Params extends Record<string, Parser>,
  any,
  any,
  any
>
  ? Path extends inferPathType<PathArray, Params>
    ? R
    : never
  : never;
type ExtractRoute<
  R,
  Method extends string,
  Path extends string = string
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
// remove searchParam and body if not needed
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
      searchParams: inferSearchParamsType<SearchParams>;
      body: inferParserType<IBody>;
    }
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

// TODO
// global request method
// refactor types for the methods
interface DredgeClient<Api extends DredgeApi<any>> {
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

  get<R extends ExtractRouteByMethod<inferRoutes<Api>[number], "get">>(
    path: ClientPath<R>,
    options: Omit<ClientOptions<R>, "method" | "path" | "body">
  ): ClientResult<R>;

  post<
    P extends ClientPath<
      ExtractRouteByMethod<inferRoutes<Api>[number], "post">
    >,
    R extends ExtractRoute<inferRoutes<Api>[number], "post", P>
    // R extends ExtractRouteByPath<
    //   ExtractRouteByMethod<inferRoutes<Api>[number], "post">,
    //   P
    // >
  >(
    path: P,
    options: Omit<ClientOptions<R>, "method" | "path">
  ): ClientResult<R>;
  // post<
  //   R extends ExtractRouteBy<inferRoutes<Api>[number], "post">,
  //   P extends RoutePath<R>
  // >(
  //   path: inferPathType<P, RouteParams<R>>,
  //   options: Omit<ClientOptions<ExtractRouteBy<R, any, P>>, "method" | "path">
  // );

  put<R extends ExtractRouteByMethod<inferRoutes<Api>[number], "put">>(
    path: ClientPath<R>,
    options: Omit<ClientOptions<R>, "method" | "path">
  ): ClientResult<R>;

  delete<R extends ExtractRouteByMethod<inferRoutes<Api>[number], "delete">>(
    path: ClientPath<R>,
    options: Omit<ClientOptions<R>, "method" | "path" | "body">
  ): ClientResult<R>;
}

// TODO
// ctx mergeDeep
export function buildDirectClient<T>(
  api: DredgeApi<T>,
  options: { initialCtx?: object } = {}
) {
  const { initialCtx = {} } = options;
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
      ...initialCtx,
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

  function makeRequest(options: ClientOptions<AnyRoute>) {
    const result = executeRoute(root, options);

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
  }

  return {
    get: (path, options) => {
      return makeRequest({
        path,
        method: "get",
        ...options,
        body: undefined,
      });
    },

    post: (path, options) => {
      return makeRequest({
        path,
        method: "post",
        ...options,
      });
    },

    delete: (path, options) => {
      return makeRequest({
        path,
        method: "delete",
        ...options,
        body: undefined,
      });
    },

    put: (path, options) => {
      return makeRequest({
        path,
        method: "put",
        ...options,
      });
    },
  } as DredgeClient<DredgeApi<T>>;
}

// const api = buildDredgeApi([userRoute, postRoute, editRoute]);
// const dredge = buildDirectClient(api, {
//   initialCtx: {},
// });

// dredge.get("/user/dhrjarun", {
//   searchParams: {
//     size: "20",
//   },
// });
// dredge.get("/user/dd", {
//   searchParams: {
//     size: "2",
//   },
// });
// const postRes = dredge.post("/posts/dhrjarun", {
//   searchParams: {
//     size: "2",
//   },
//   body: "here is the body",
// });

// const putRes = dredge.put("/edit/FirstName", {
//   body: {
//     name: "ok",
//   },
//   searchParams: {
//     size: "",
//     withHistory: false,
//   },
// });

// type RouteArrayToPathStr<T, Method extends string = string> = T extends [
//   infer First extends AnyRoute,
//   ...infer Tail
// ]
//   ? First extends Route<any, infer $Method, infer Path, any, any>
//     ? $Method extends Method
//       ? inferPathType<Path> | RouteArrayToPathStr<Tail, Method>
//       : RouteArrayToPathStr<Tail, Method>
//     : ""
//   : "";

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
