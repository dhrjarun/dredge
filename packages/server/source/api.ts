import { getParseFn } from "@dredge/common";
import type {
  AnyDredgeApi,
  AnyRoute,
  ApiBuilderDef,
  MarkOptional,
  ParsedRequest,
  ParsedResponse,
  ParsedSearchParams,
  RawRequest,
  _DredgeApi,
} from "@dredge/common";
import { mergeDeep, mergeHeaders } from "./utils/merge";

export function dredgeApi<Context extends object = {}>() {
  return createApiBuilder({}) as _DredgeApi<
    Context,
    [],
    Context,
    Context,
    Context
  >;
}

function createApiBuilder(initDef: Partial<ApiBuilderDef>) {
  const {
    routes = [],
    inputTransformers = [],
    outputTransformers = [],
    errorMiddlewares = [],
  } = initDef;

  const def: ApiBuilderDef = {
    options: {},
    routes,
    inputTransformers,
    outputTransformers,
    errorMiddlewares,
  };

  const rootPath = new DredgePath({
    name: "$root",
  });

  const builder = {
    _def: def,

    options: (opts) => {
      return createApiBuilder({
        ...def,
        options: {
          prefixUrl: opts.prefixUrl
            ? new URL(opts.prefixUrl)
            : def.options.prefixUrl,
          defaultContext: opts.defaultContext || def.options.defaultContext,
        },
      });
    },

    routes: (routes) => {
      routes.forEach((route) => {
        const def = route._def;
        const paths = def.paths as string[];

        let current = rootPath;
        paths.forEach((name) => {
          if (!current.hasChild(name)) {
            current.addChild(name);
          }
          current = current.getChild(name)!;
        });

        current.setRoute(route);
      });

      return createApiBuilder({
        ...def,
        routes: [...def.routes, ...routes],
      });
    },

    transformIn: (fn) => {
      return createApiBuilder({
        ...def,
        inputTransformers: [...def.inputTransformers, fn],
      });
    },

    transformOut: (fn) => {
      return createApiBuilder({
        ...def,
        outputTransformers: [...def.outputTransformers, fn],
      });
    },

    error: (fn) => {
      return createApiBuilder({
        ...def,
        errorMiddlewares: [...def.errorMiddlewares, fn],
      });
    },

    resolveRoute: (request) => {
      return "" as any;
    },
    resolveRouteWithoutTransforms: (request) => {
      return resolveRouteWithoutTransforms(rootPath, request);
    },

    transformRequest: async (request) => {
      const { prefixUrl, defaultContext } = def.options;
      let _path = "";
      if ("path" in request) {
        _path = request.path;
      } else if ("url" in request) {
        const initialPathname = trimSlashes(prefixUrl?.pathname || "/");

        _path = request.url.pathname;

        if (!_path.startsWith(initialPathname)) {
          throw "Invalid url";
        }

        _path = trimSlashes(_path).slice(initialPathname.length);
      }

      const path = trimSlashes(_path);
      const pathArray = path.split("/");

      let current = rootPath;
      pathArray.forEach((item) => {
        const child = current.getStaticChild(item) || current.getDynamicChild();

        if (!child) {
          throw "Invalid path";
        }

        current = child;
      });

      const routeDef = current.getRoute(request.method)!._def;
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

      let currentCtx = {
        ...defaultContext,
        ...request.ctx,
      };
      const searchParams =
        "searchParams" in request
          ? request.searchParams
          : searchParamsToObject(request.url.searchParams);
      const data = "data" in request ? request.data : null;

      let transformedRequest: ParsedRequest = {
        params,
        path,
        headers: request.headers,
        method: request.method,
        data,
        searchParams,
      };

      try {
        if ("url" in request) {
          for (const middleware of def.inputTransformers) {
            const result = await middleware({
              ...request,
              $parsed: transformedRequest,
              next: (options?: any) => {
                const { headers, method, searchParams, params, path } =
                  transformedRequest;

                return {
                  ctx: mergeDeep(currentCtx, options?.ctx || {}),
                  data: options.data,
                  headers: mergeHeaders(headers, options?.headers || {}),
                  method: method,
                  searchParams: {
                    ...searchParams,
                    ...(options?.searchParams || {}),
                  },
                  params: params,
                  path: path,
                };
              },
            });

            const { ctx, ...newRequest } = result;

            currentCtx = ctx;
            transformedRequest = newRequest;
          }
        }
      } catch (err) {
        return Promise.reject({});
      }

      return transformedRequest;
    },
  } as AnyDredgeApi;

  return builder;
}

function searchParamsToObject(searchParams: URLSearchParams) {
  const obj: ParsedSearchParams = {};
  Object.entries(searchParams).forEach(([key, value]) => {
    if (!obj[key]) {
      obj[key] = value;
      return;
    }
    const currentValue = typeof obj[key] === "string" ? [obj[key]] : obj[key];
    obj[key] = [...currentValue, value];
  });

  return obj;
}

function getRouteDef(
  root: DredgePath,
  request: RawRequest | ParsedRequest,
  prefixUrl?: URL,
) {
  let _path = "";
  if ("path" in request) {
    _path = request.path;
  } else if ("url" in request) {
    const initialPathname = trimSlashes(prefixUrl?.pathname || "/");

    _path = request.url.pathname;

    if (!_path.startsWith(initialPathname)) {
      throw "Invalid url";
    }

    _path = trimSlashes(_path).slice(initialPathname.length);
  }

  const path = trimSlashes(_path);
  const pathArray = path.split("/");

  let current = root;
  pathArray.forEach((item) => {
    const child = current.getStaticChild(item) || current.getDynamicChild();

    if (!child) {
      throw "Invalid path";
    }

    current = child;
  });

  const routeDef = current.getRoute(request.method)!._def || null;

  return routeDef;
}

export async function resolveRouteWithoutTransforms(
  root: DredgePath,
  request: MarkOptional<ParsedRequest, "params"> & {
    ctx: any;
  },
): Promise<ParsedResponse> {
  const {
    ctx = {},
    path: _path,
    searchParams = {},
    data,
    method = "get",
    headers = {},
  } = request;

  const path = trimSlashes(_path);
  const pathArray = path.split("/");

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

  let validatedRequest: any = {
    method,
    headers,
    path,
  };

  let currentCtx = {
    ...ctx,
  };

  let response: ParsedResponse = {
    headers: {},
    data: null,
  };

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
          const validatedParams: Record<string, any> = {};
          for (const [index, item] of routeDef.paths.entries()) {
            if (item.startsWith(":")) {
              const parser = routeDef.params[item.replace(":", "")];
              validatedParams[item] = parser
                ? await getParseFn(parser)(pathArray[index])
                : pathArray[index];
            }
          }
          validatedRequest.params = validatedParams;

          step = "SEARCH_PARAM_VALIDATION";
          break;
        case "SEARCH_PARAM_VALIDATION":
          const validatedSearchParams: Record<string, any> = {};
          for (const [key, parser] of Object.entries(routeDef.searchParams)) {
            validatedSearchParams[key] = await getParseFn(parser)(
              searchParams[key],
            );
          }
          validatedRequest.searchParams = validatedSearchParams;

          step = "BODY_VALIDATION";
          break;
        case "BODY_VALIDATION":
          let validatedData: unknown;

          if (routeDef.iBody) {
            validatedData = await getParseFn(routeDef.iBody)(data);
            validatedRequest.data = validatedData;
          }

          step = "MIDDLEWARE_CALLS";
          break;
        case "MIDDLEWARE_CALLS":
          routeDef.middlewares.forEach(async (fn) => {
            const middlewareResult = await fn(validatedRequest, {
              ...response,
              ctx: currentCtx,
              next(nextOptions?: any) {
                return {
                  ctx: mergeDeep(currentCtx, nextOptions?.ctx),
                  headers: mergeHeaders(response.headers, nextOptions?.headers),
                  status: nextOptions?.status,
                  statusText: nextOptions?.statusText,
                  data: null,
                };
              },
            });

            const { ctx, ...res } = middlewareResult;
            currentCtx = ctx;
            response = res;
          });

          step = "RESOLVER_CALL";
          break;
        case "RESOLVER_CALL":
          if (!routeDef.resolver) {
            throw "No resolver exist";
          }

          const result = await routeDef.resolver(validatedRequest, {
            ...response,
            ctx: currentCtx,
            send(options?: any) {
              return {
                headers: mergeHeaders(response.headers, options?.headers),
                data: options.data,
                status: response.status || 200,
                statusText: response.statusText || "ok",
              };
            },
          });

          response = result;
          step = "DONE";
      }
    } catch (error) {
      return Promise.reject({});
    }
  }

  return response;
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
