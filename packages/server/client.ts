import {
  inferPathType,
  inferSearchParamsType,
  AnyRoute,
  Route,
  createRouteBuilder,
  ResolverResult,
} from "./route";
import { Parser, inferParserType } from "./parser";
import { DredgeApi, buildDredgeApi } from "./api";
import z from "zod";

type inferRoutes<Api> = Api extends DredgeApi<infer Routes extends AnyRoute[]>
  ? Routes
  : never;

type ExtractRouteBy<R, Method, Path extends Array<any> = any> = Extract<
  R,
  Route<any, Method, Path, any, any>
>;

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
      body: IBody extends null ? never : inferParserType<IBody>;
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
  ): ClientResult<R>;

  post<R extends ExtractRouteBy<inferRoutes<Api>[number], "post">>(
    path: ClientPath<R>,
    options: Omit<ClientOptions<R>, "method" | "path">
  ): ClientResult<R>;

  put<R extends ExtractRouteBy<inferRoutes<Api>[number], "put">>(
    path: ClientPath<R>,
    options: Omit<ClientOptions<R>, "method" | "path">
  ): ClientResult<R>;

  delete<R extends ExtractRouteBy<inferRoutes<Api>[number], "delete">>(
    path: ClientPath<R>,
    options: Omit<ClientOptions<R>, "method" | "path" | "body">
  ): ClientResult<R>;
}

function buildDirectClient<T>(
  api: DredgeApi<T>,
  options: { initialCtx?: object } = {}
) {
  const { initialCtx = {} } = options;
  const root = api._root;

  function createSteps(
    route: AnyRoute,
    clientOptions: ClientOptions<AnyRoute>
  ) {
    const routeDef = route?._def;

    const { path, searchParams, method, body } = clientOptions;
    const paths = path.split("/");
    const parsedSearchParams = {};
    const parsedParams = {};
    let currentCtx: any = {
      ...initialCtx,
    };
    let resolverResult: ResolverResult<any>;

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
                parsedParams[item] = parser?.(paths[index]) || paths[index];
              }
            });
            step = "SEARCH_PARAM_VALIDATION";
            break;
          case "SEARCH_PARAM_VALIDATION":
            Object.entries(routeDef.searchParams).forEach(([key, parserFn]) => {
              parsedSearchParams[key] = parserFn(searchParams[key]);
            });

            step = "BODY_VALIDATION";
            break;
          case "BODY_VALIDATION":
            if()

            step = "MIDDLEWARE_CALLS";
            break;
          case "MIDDLEWARE_CALLS":
            // middlewares calls
            routeDef.middlewares.forEach((fn) => {
              const middlewareResult = fn({
                method: "get",
                ctx: currentCtx,
                params: parsedParams,
                searchParams: parsedSearchParams,
                path: paths.join("/"),
                body: null,
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
              method: "get",
              ctx: currentCtx,
              params: parsedParams,
              searchParams: parsedSearchParams,
              path: paths.join("/"),
              body: null,
              send(resolverOptions?: any) {
                return resolverOptions;
              },
            });

            step = "DONE";
            break;
        }
      } catch (err) {
        // resolverResult = routeDef.

        step = "DONE";
      }
    }

    return resolverResult!;
  }

  return {
    get: (pathStr, options) => {
      // TODO validate pathStr
      const paths = pathStr.split("/");

      let current = root;
      paths.forEach((item, index) => {
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

      const result = createSteps(current.route!, {
        ...options,
        path: "",
        method: "get",
      });
      // TODO: return response object {body, headers, status, statusText}
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
dredge.get("user/dhrjarun/", {
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
