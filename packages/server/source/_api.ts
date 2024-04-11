import { getParseFn } from "./parser";
import { mergeDeep } from "./utils/merge";
import {
  DredgeClient,
  Transformer,
  AnyRoute,
  ResolverResult,
  ResolverOptions,
} from "@dredge/common";

// TODO:
// remoe getCaller
export interface DredgeApi<Context extends object, Routes extends AnyRoute[]> {
  _def: {
    root: DredgePath;
    context: Context;
    transformer: Transformer;
  };

  resolveRoute(options: ResolverOptions): Promise<ResolverResult<any>>;
  getCaller: (context: Context) => DredgeClient<Routes>;
}

export function dredgeApi<
  Context extends object,
  const Routes extends AnyRoute[]
>(options: { routes: Routes }): DredgeApi<Context, Routes> {
  const { routes } = options;

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

    resolveRoute: (options) => {
      return resolveRoute(root, options);
    },

    getCaller(ctx: Context) {
      const client = ((path, options) => {
        const result = resolveRoute(root, {
          ctx,
          ...options,
          path,
        });

        const response = result as any;

        response.data = () => {
          return new Promise((resolve, reject) => {
            result
              .then((re) => {
                resolve(re.data);
              })
              .catch((err) => {
                reject(err);
              });
          });
        };

        return response;
      }) as DredgeClient<Routes>;

      const aliases = [
        "get",
        "post",
        "put",
        "patch",
        "head",
        "delete",
      ] as const;

      for (const method of aliases) {
        client[method] = (path: string, options) =>
          client(path as any, { ...options, method }) as any;
      }

      return client;
    },
  } as DredgeApi<Context, Routes>;
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
      // this.routes[item._def.method || "get"] = item;
      this.routes.set(item._def.method || "get", item);
    });
  }

  hasStaticChild(name: string) {
    return this.children.has(name);
  }

  getRoute(method: string) {
    return this.routes.get(method);
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
      })
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

export async function resolveRoute(
  root: DredgePath,
  clientOptions: ResolverOptions
): Promise<ResolverResult<any>> {
  const {
    ctx = {},
    path,
    searchParams = {},
    data,
    method = "get",
  } = clientOptions;
  const pathArray = trimSlashes(path).split("/");

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
    (acc: any, item, index) => {
      if (item.startsWith(":")) {
        acc[item.replace(":", "")] = pathArray[index];
      }
      return acc;
    },
    {}
  );
  const parsedSearchParams: Record<string, any> = {};
  const parsedParams: Record<string, any> = {};
  let parsedBody: unknown;
  let currentCtx: any = {
    ...ctx,
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
          for (const [index, item] of routeDef.paths.entries()) {
            if (item.startsWith(":")) {
              const parser = routeDef.params[item.replace(":", "")];
              parsedParams[item] = parser
                ? await getParseFn(parser)(pathArray[index])
                : pathArray[index];
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
            parsedBody = await getParseFn(routeDef.iBody)(data);
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
              data: parsedBody,
              next(nextOptions?: any) {
                return {
                  ctx: mergeDeep(currentCtx, ...nextOptions?.ctx),
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
          resolverResult = await routeDef.resolver({
            method,
            ctx: currentCtx,
            params: parsedParams,
            searchParams: parsedSearchParams,
            path: pathArray.join("/"),
            data: parsedBody,
            send(resolverOptions?: any) {
              return resolverOptions;
            },
          });

          step = "DONE";
          break;
      }
    } catch (error) {
      resolverResult = await routeDef.errorResolver?.({
        error,
        errorOrigin: step,
        method,
        path: pathArray.join("/"),
        params,
        searchParams,
        data,
        send(options?: any) {
          return {
            ...options,
          };
        },
      })!;

      step = "DONE";
    }
  }

  return resolverResult!;
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
  }
): ResolverResult<any> {
  const result: ResolverResult<any> = {
    status: options.status || defaults.status,
    statusText: options.statusText || defaults.statusText,
  };
}
