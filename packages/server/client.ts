import {
  inferPathType,
  inferSearchParamsType,
  AnyRoute,
  Route,
  createRouteBuilder,
  ResolverResult,
} from "./route";
import { Parser, getParseFn, inferParserType } from "./parser";
import { DredgeApi, buildDredgeApi } from "./api";
import z from "zod";
import { MaybePromise } from "./types";

type inferRoutes<Api> = Api extends DredgeApi<infer Routes extends AnyRoute[]>
  ? Routes
  : never;

type ExtractRouteBy<
  R,
  Method extends string,
  Path extends Array<any> = any
> = Extract<R, Route<any, Method, Path, any, any, any>>;

type ClientPath<R> = R extends Route<
  any,
  any,
  infer Path,
  infer Params extends Record<string, Parser>,
  any,
  any
>
  ? inferPathType<Path, Params>
  : never;

// TODO: AnyClientOptions
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

class ClientResponse<T> {
  promise: Promise<any>;

  constructor(p = Promise.resolve()) {
    this.promise = p;
  }
}

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
      body: inferParserType<OBody>;
      headers: Record<string, string>;
      status: number;
      statusText: string;
    }
  : never;

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

  get<R extends ExtractRouteBy<inferRoutes<Api>[number], "get">>(
    path: ClientPath<R>,
    options: Omit<ClientOptions<R>, "method" | "path" | "body">
  ): Promise<ClientResult<R>>;

  post<R extends ExtractRouteBy<inferRoutes<Api>[number], "post">>(
    path: ClientPath<R>,
    options: Omit<ClientOptions<R>, "method" | "path">
  ): Promise<ClientResult<R>>;

  put<R extends ExtractRouteBy<inferRoutes<Api>[number], "put">>(
    path: ClientPath<R>,
    options: Omit<ClientOptions<R>, "method" | "path">
  ): Promise<ClientResult<R>>;

  delete<R extends ExtractRouteBy<inferRoutes<Api>[number], "delete">>(
    path: ClientPath<R>,
    options: Omit<ClientOptions<R>, "method" | "path" | "body">
  ): Promise<ClientResult<R>>;
}

function buildDirectClient<T>(
  api: DredgeApi<T>,
  options: { initialCtx?: object } = {}
) {
  const { initialCtx = {} } = options;
  const root = api._root;

  // parsed body with promise
  function executeRoute(
    route: AnyRoute,
    clientOptions: Omit<ClientOptions<AnyRoute>, "method">
  ) {
    const routeDef = route?._def;

    const { path, searchParams, body } = clientOptions;
    const paths = path.split("/");
    const params: Record<string, string> = routeDef.paths.reduce(
      (acc, item, index) => {
        if (item.startsWith(":")) {
          acc[item.replace(":", "")] = paths[index];
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
            routeDef.paths.forEach((item, index) => {
              if (item.startsWith(":")) {
                const parser = routeDef.params[item.replace(":", "")];
                parsedParams[item] =
                  getParseFn(parser)(paths[index]) || paths[index];
              }
            });
            step = "SEARCH_PARAM_VALIDATION";
            break;
          case "SEARCH_PARAM_VALIDATION":
            Object.entries(routeDef.searchParams).forEach(([key, parser]) => {
              parsedSearchParams[key] = getParseFn(parser)(searchParams[key]);
            });

            step = "BODY_VALIDATION";
            break;
          case "BODY_VALIDATION":
            if (routeDef.iBody) {
              parsedBody = getParseFn(routeDef.iBody)(body);
            }

            step = "MIDDLEWARE_CALLS";
            break;
          case "MIDDLEWARE_CALLS":
            routeDef.middlewares.forEach(async (fn) => {
              const middlewareResult = await fn({
                method: "get",
                ctx: currentCtx,
                params: parsedParams,
                searchParams: parsedSearchParams,
                path: paths.join("/"),
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
              method: routeDef.method,
              ctx: currentCtx,
              params: parsedParams,
              searchParams: parsedSearchParams,
              path: paths.join("/"),
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
          method: routeDef.method!,
          send(resolverOptions?: any) {
            return resolverOptions;
          },
        })!;

        step = "DONE";
      }
    }

    return resolverResult!;
  }

  function findRoute(method: string, path: string) {
    // TODO validate pathStr
    const pathArray = path.split("/");

    let current = root;
    pathArray.forEach((item, index) => {
      const child = root.getStaticChild(item) || root.getDynamicChild();

      if (!child) {
        throw "Invalid path";
      }

      current = child;
    });

    const routeDef = current.route?._def;
    if (!routeDef) {
      throw "Invalid path, no route exist";
    }
    if (routeDef.method !== "get") {
      throw "Invalid path, no get method";
    }

    return current.route!;
  }

  return {
    get: (pathStr, options) => {
      const route = findRoute("get", pathStr);
      const result = executeRoute(route, {
        ...options,
        path: pathStr,
        body: undefined,
      });
      return {
        ...result,
      };
    },
  } as DredgeClient<DredgeApi<T>>;
}

let userRoute = createRouteBuilder()
  .path("user", ":username")
  .params({
    username: z.enum(["dhrjarun", "dd"]),
  })
  .searchParam({
    size: z.string(),
  })
  .get()
  .resolve(({ send, body, params, searchParams, method }) => {
    return send({
      body: [
        {
          id: "u1",
          username: "dhrjarun",
        },
      ],
    });
  });

let postRoute = createRouteBuilder()
  .path("posts", ":user")
  .params({
    user: z.enum(["dhrjarun", "dd"]),
  })
  .searchParam({
    size: z.string(),
  })
  .post(z.string())
  .resolve(({ send }) => {
    return send({
      body: [{ id: "p1", title: "Post1" }],
    });
  });

let editRoute = createRouteBuilder()
  .path("edit", ":name")
  .params({
    name: z.enum(["FirstName", "LastName"]),
  })
  .searchParam({
    size: z.string(),
    withHistory: z.boolean(),
  })
  .put(
    z.object({
      name: z.string(),
    })
  )
  .use(({ next }) => {
    return next();
  })
  .resolve(({ send }) => {
    return send({
      body: true,
    });
  });

const api = buildDredgeApi([userRoute, postRoute, editRoute]);
const dredge = buildDirectClient(api, {
  initialCtx: {},
});

dredge.get("user/dhrjarun/", {
  searchParams: {
    size: "20",
  },
});
dredge.get("user/dd/", {
  searchParams: {
    size: "2",
  },
});
const postRes = dredge.post("posts/dhrjarun/", {
  searchParams: {
    size: "2",
  },
  body: "here is the body",
});

const putRes = dredge.put("edit/FirstName/", {
  body: {
    name: "ok",
  },
  searchParams: {
    size: "",
    withHistory: false,
  },
});

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

type Api = typeof api;

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
