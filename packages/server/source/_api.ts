import { type ResolverResultPromise, getParseFn } from "@dredge/common";
import type {
  AnyRoute,
  ResolverOptions,
  ResolverResult,
  _DredgeApi,
} from "@dredge/common";
import { mergeDeep, mergeHeaders } from "./utils/merge";

export function dredgeApi<Context extends object = {}>() {
  const fn = <const Routes extends AnyRoute[]>(
    routes: Routes,
  ): _DredgeApi<Context, Routes> => {
    return buildDredgeApi(routes);
  };

  return fn;
}

export function buildDredgeApi<
  Context extends object,
  const Routes extends AnyRoute[],
>(routes: Routes): _DredgeApi<Context, Routes> {
  const root = new DredgePath({
    name: "$root",
  });

  routes.forEach((route) => {
    const def = route._def;
    const paths = def.paths as string[];

    let current = root;
    paths.forEach((name) => {
      if (!current.hasChild(name)) {
        current.addChild(name);
      }
      current = current.getChild(name)!;
    });

    current.setRoute(route);
  });

  return {
    _def: {
      root,
    },

    resolveRoute: (path, options) => {
      return resolveRoute(root, {
        path,
        ...options,
      });
    },
  } as _DredgeApi<Context, Routes>;
}

export class DredgePath {
  name: string;
  isParam: boolean;

  routes = new Map<string, AnyRoute>();

  children = new Map<string, DredgePath>();
  dynamicChild: DredgePath | null = null;

  constructor(options: {
    name: string;
    isParam?: boolean;
    routes?: AnyRoute[];
  }) {
    const { name, isParam = false, routes = [] } = options;
    this.name = name;
    this.isParam = isParam;

    routes.forEach((item) => {
      this.routes.set(item._def.method || "get", item);
    });
  }

  hasStaticChild(name: string) {
    return this.children.has(name);
  }

  getRoute(method: string) {
    return this.routes.get(method.toLowerCase());
  }
  setRoute(route: AnyRoute) {
    this.routes.set(route._def.method || "get", route);
  }

  hasChild(name: string) {
    if (name.startsWith(":")) {
      return this.hasDynamicChild();
    }

    return this.hasStaticChild(name);
  }

  hasDynamicChild() {
    return !!this.dynamicChild;
  }

  addChild(name: string, routes?: AnyRoute[]) {
    if (name.startsWith(":")) {
      this.dynamicChild = new DredgePath({
        name: name.replace(":", ""),
        isParam: true,
        routes,
      });
      return;
    }

    this.children.set(
      name,
      new DredgePath({
        name,
        routes,
      }),
    );
  }

  getStaticChild(name: string) {
    return this.children.get(name);
  }
  getDynamicChild() {
    return this.dynamicChild;
  }

  getChild(name: string) {
    if (name.startsWith(":")) {
      return this.getDynamicChild();
    }

    return this.getStaticChild(name);
  }
}

// from trpc
const trimSlashes = (path: string): string => {
  path = path.startsWith("/") ? path.slice(1) : path;
  path = path.endsWith("/") ? path.slice(0, -1) : path;

  return path;
};

export function resolveRoute(
  root: DredgePath,
  clientOptions: ResolverOptions,
): ResolverResultPromise<any> {
  const {
    ctx = {},
    path: _path,
    searchParams = {},
    data,
    method = "get",
    headers = {},
  } = clientOptions;
  const pathArray = trimSlashes(_path).split("/");
  const path = pathArray.join("/");

  let current = root;
  pathArray.forEach((item) => {
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
    (acc: any, item, index) => {
      if (item.startsWith(":")) {
        acc[item.replace(":", "")] = pathArray[index];
      }
      return acc;
    },
    {},
  );
  const parsedSearchParams: Record<string, any> = {};
  const parsedParams: Record<string, any> = {};
  let parsedBody: unknown;

  let req: any = {
    method,
    headers,
    path,
  };
  let res: any = {
    ctx: {
      ...ctx,
    },
    headers: {},
    data: null,
  };

  // let resolverResult: ResolverResult<any>;

  let step:
    | "PARAM_VALIDATION"
    | "SEARCH_PARAM_VALIDATION"
    | "BODY_VALIDATION"
    | "MIDDLEWARE_CALLS"
    | "RESOLVER_CALL"
    | "DONE" = "PARAM_VALIDATION";

  async function fn() {
    while (step != "DONE") {
      try {
        switch (step) {
          case "PARAM_VALIDATION":
            for (const [index, item] of routeDef.paths.entries()) {
              if (item.startsWith(":")) {
                const parser = routeDef.params[item.replace(":", "")];
                parsedParams[item] = parser
                  ? await getParseFn(parser)(pathArray[index])
                  : pathArray[index];
              }
            }
            req.params = parsedParams;

            step = "SEARCH_PARAM_VALIDATION";
            break;
          case "SEARCH_PARAM_VALIDATION":
            for (const [key, parser] of Object.entries(routeDef.searchParams)) {
              parsedSearchParams[key] = await getParseFn(parser)(
                searchParams[key],
              );
            }
            req.searchParams = parsedSearchParams;

            step = "BODY_VALIDATION";
            break;
          case "BODY_VALIDATION":
            if (routeDef.iBody) {
              parsedBody = await getParseFn(routeDef.iBody)(data);
              req.data = parsedBody;
            }

            step = "MIDDLEWARE_CALLS";
            break;
          case "MIDDLEWARE_CALLS":
            routeDef.middlewares.forEach(async (fn) => {
              const middlewareResult = await fn(req, {
                ...res,
                next(nextOptions?: any) {
                  return {
                    ctx: mergeDeep(res.ctx, nextOptions?.ctx),
                    headers: mergeHeaders(res.headers, nextOptions?.headers),
                    status: nextOptions?.status,
                    statusText: nextOptions?.statusText,
                    data: null,
                  };
                },
              });

              res = middlewareResult;
            });

            step = "RESOLVER_CALL";
            break;
          case "RESOLVER_CALL":
            if (!routeDef.resolver) {
              throw "No resolver exist";
            }

            const result = await routeDef.resolver(req, {
              ...res,
              send(options?: any) {
                return sendFn(options, {
                  headers: res.headers,
                  status: res.status || 200,
                  statusText: res.statusText || "ok",
                });
              },
            });
            step = "DONE";
            return result;
        }
      } catch (error) {
        const result = await routeDef.errorResolver(
          {
            error,
            errorOrigin: step,
          },
          {
            method,
            headers,
            path,
            params,
            searchParams,
            data,
          },
          {
            ...res,
            send(options?: any) {
              return sendFn(options, {
                status: 500,
                statusText: "Something wen't wrong",
              });
            },
          },
        )!;

        step = "DONE";
        return result;
      }
    }
  }
  const resultPromise = fn() as ResolverResultPromise;
  resultPromise.data = async () => {
    const result = await resultPromise;
    return result.data();
  };

  return resultPromise;
}

function sendFn(
  options: {
    data?: any;
    error?: any;
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  },
  defaults: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {},
): ResolverResult<any> {
  const result = {
    status: options.status || defaults.status,
    statusText: options.statusText || defaults.statusText,
    headers: mergeHeaders(defaults.headers || {}, options.headers || {}),
  } as ResolverResult<any>;

  result.ok = result.status > 199 && result.status < 300;

  result.data = () => {
    return new Promise((resolve, reject) => {
      if (result.ok) {
        resolve(options.data);
      } else {
        reject(options.error);
      }
    });
  };

  return result;
}