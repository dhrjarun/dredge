import { getParseFn } from "@dredge/common";
import type {
  AnyDredgeApi,
  AnyRoute,
  ApiBuilderDef,
  DredgeApi,
  DredgeSearchParams,
  ParsedRequest,
  RawResponse,
} from "@dredge/common";
import { mergeDeep, mergeHeaders } from "./utils/merge";

export function dredgeApi<Context extends object = {}>() {
  return createApiBuilder({}) as DredgeApi<
    Context,
    [],
    Context,
    Context,
    Context
  >;
}

function createApiBuilder(
  initDef: Partial<ApiBuilderDef> & { rootPath?: DredgePath },
) {
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

  const rootPath =
    initDef.rootPath ||
    new DredgePath({
      name: "$root",
    });

  const builder = {
    _def: def,

    options: (opts) => {
      return createApiBuilder({
        ...def,
        rootPath,
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
        rootPath,
      });
    },

    transformIn: (fn) => {
      return createApiBuilder({
        ...def,
        rootPath,
        inputTransformers: [...def.inputTransformers, fn],
      });
    },

    transformOut(fn) {
      return createApiBuilder({
        ...def,
        rootPath,
        outputTransformers: [...def.outputTransformers, fn],
      });
    },

    error: (fn) => {
      return createApiBuilder({
        ...def,
        rootPath,
        errorMiddlewares: [...def.errorMiddlewares, fn],
      });
    },

    async resolveRoute(ctx, request) {
      const rf = getRouteDef(
        rootPath,
        request.method,
        request.url,
        def.options.prefixUrl,
      );

      const { params, path } = rf.getPathParams();
      const transformedRequest = await this.transformRequest(ctx, {
        ...request,
        $parsed: {
          data: null,
          params,
          path,
          headers: request.headers,
          method: request.method,
          searchParams: searchParamsToObject(request.url.searchParams),
        },
      });

      return rf.validateAndExecute(
        {
          ...transformedRequest,
          path,
          params,
        },
        ctx,
      );
    },

    async resolveRouteWithoutTransforms(ctx, request) {
      const rf = getRouteDef(rootPath, request.method, request.path);
      const { params, path } = rf.getPathParams();

      return rf.validateAndExecute(ctx, {
        ...request,
        path,
        params,
      });
    },

    async transformRequest(ctx, request) {
      let transformedRequest = request.$parsed;

      let currentCtx = {
        ...def.options.defaultContext,
        ...ctx,
      };

      try {
        for (const middleware of def.inputTransformers) {
          const result = await middleware({
            ...request,
            ctx: currentCtx,
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
      } catch (err) {
        return Promise.reject({});
      }

      return transformedRequest;
    },

    async transformResponse(ctx, request, response) {
      let transformedResponse: RawResponse = {
        body: null,
        headers: response.headers,
        status: response.status || 200,
        statusText: response.statusText || "ok",
      };

      let currentCtx = {
        ...def.options.defaultContext,
        ...ctx,
      };

      try {
        for (const middleware of def.outputTransformers) {
          const result = await middleware(request, {
            ...response,
            $raw: transformedResponse,
            ctx: currentCtx,
            next: (options?: any) => {
              const { status, statusText, headers, body } = transformedResponse;

              return {
                ctx: mergeDeep(currentCtx, options?.ctx || {}),
                headers: mergeHeaders(headers, options?.headers || {}),
                body: options.body || body,
                status: options.status || status,
                statusText: options.statusText || statusText,
              };
            },
          });

          const { ctx, ...newResponse } = result;

          currentCtx = ctx;
          transformedResponse = newResponse;
        }
      } catch (err) {
        return Promise.reject({});
      }

      return transformedResponse;
    },
  } as AnyDredgeApi;

  return builder;
}

function searchParamsToObject(searchParams: URLSearchParams) {
  const obj: DredgeSearchParams = {};
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
  method: string,
  url: URL | string,
  prefixUrl?: URL,
) {
  let _path = url instanceof URL ? url.pathname : url;

  const initialPathname = trimSlashes(prefixUrl?.pathname || "/");
  if (!_path.startsWith(initialPathname)) {
    throw "Invalid url";
  }

  _path = trimSlashes(_path).slice(initialPathname.length);

  let current = root;
  const path = trimSlashes(_path);
  const pathArray = path.split("/");

  pathArray.forEach((item) => {
    const child = current.getStaticChild(item) || current.getDynamicChild();

    if (!child) {
      throw "Invalid path";
    }

    current = child;
  });

  const routeDef = current.getRoute(method)!._def || null;

  return {
    getPathParams() {
      const params: Record<string, string> = routeDef.paths.reduce(
        (acc: any, item, index) => {
          if (item.startsWith(":")) {
            acc[item.replace(":", "")] = pathArray[index];
          }
          return acc;
        },
        {},
      );

      return {
        path,
        params,
      };
    },

    async validate(request: ParsedRequest) {
      const {
        path,
        searchParams = {},
        data,
        method = "get",
        headers = {},
        params = {},
      } = request;

      let validatedRequest: any = {
        method,
        headers,
        path,
        params,
        data,
        searchParams,
      };

      let step:
        | "PARAM_VALIDATION"
        | "SEARCH_PARAM_VALIDATION"
        | "DATA_VALIDATION"
        | "DONE" = "PARAM_VALIDATION";

      try {
        switch (step as any) {
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

            step = "DATA_VALIDATION";
            break;
          case "DATA_VALIDATION":
            let validatedData: unknown;

            if (routeDef.iBody) {
              validatedData = await getParseFn(routeDef.iBody)(data);
              validatedRequest.data = validatedData;
            }

            step = "DONE";
            break;
        }

        return validatedRequest;
      } catch (error) {
        return Promise.reject({});
      }
    },

    async execute(ctx: any, validatedRequest: any) {
      let currentCtx = ctx;
      let response: any = {
        headers: {},
      };

      let step: "MIDDLEWARE_CALLS" | "RESOLVER_CALL" | "DONE" =
        "MIDDLEWARE_CALLS";

      try {
        while (step !== "DONE") {
          switch (step as string) {
            case "MIDDLEWARE_CALLS":
              for (const fn of routeDef.middlewares) {
                const middlewareResult = await fn(validatedRequest, {
                  ...response,
                  ctx: currentCtx,
                  next(nextOptions?: any) {
                    return {
                      ctx: mergeDeep(currentCtx, nextOptions?.ctx),
                      headers: mergeHeaders(
                        response.headers,
                        nextOptions?.headers,
                      ),
                      status: nextOptions?.status,
                      statusText: nextOptions?.statusText,
                      data: null,
                    };
                  },
                });

                const { ctx, ...newResponse } = middlewareResult;
                currentCtx = ctx;
                response = newResponse;
              }

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
                  const dataShortcuts = ["data", ...routeDef.dataShortcuts];
                  let data: any = null;
                  let dataShortcutUsed: string = "auto";

                  for (const item of dataShortcuts) {
                    if (typeof options[item] !== "undefined") {
                      data = options[item];
                      dataShortcutUsed =
                        item === "data" ? "auto" : dataShortcutUsed;
                      break;
                    }
                  }

                  return {
                    headers: mergeHeaders(response.headers, options?.headers),
                    data: data,
                    status: response.status || 200,
                    statusText: response.statusText || "ok",
                    dataShortcutUsed,
                  };
                },
              });

              response = result;
              step = "DONE";
          }
        }

        return response;
      } catch (error) {
        return Promise.reject({});
      }
    },

    async validateAndExecute(ctx: any, request: ParsedRequest) {
      const req = await this.validate(request);

      const result = this.execute(ctx, req);

      return result;
    },
  };
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
