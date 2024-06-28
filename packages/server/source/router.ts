import { getParseFn } from "@dredge/common";
import type { AnyRoute, DredgeHeaders, MiddlewareResult } from "@dredge/common";
import parsePath from "parse-path";
import { mergeDeep, mergeHeaders } from "./utils/merge";

export class RoutePath {
  name: string;
  isParam: boolean;

  routes = new Map<string, AnyRoute>();

  children = new Map<string, RoutePath>();
  dynamicChild: RoutePath | null = null;

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
      this.dynamicChild = new RoutePath({
        name: name.replace(":", ""),
        isParam: true,
        routes,
      });
      return;
    }

    this.children.set(
      name,
      new RoutePath({
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

const trimSlashes = (path: string): string => {
  path = path.startsWith("/") ? path.slice(1) : path;
  path = path.endsWith("/") ? path.slice(0, -1) : path;

  return path;
};

export function dredgeRouter<const Routes extends AnyRoute[]>(routes: Routes) {
  const root = new RoutePath({
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

    call: (
      path: string,
      options: {
        headers?: DredgeHeaders;
        method?: string;
        data?: any;
        searchParams?: Record<string, any>;
        ctx: any;
        prefixUrl?: string;
      },
    ): Promise<{
      headers: Record<string, string>;
      status?: number;
      statusText?: string;
      dataType?: string;
      data: any;
    }> => {
      const {
        method = "get",
        headers = {},
        data = null,
        searchParams = {},
        ctx = {},
        prefixUrl = "/",
      } = options;

      // TODO: validate path

      let current = root;
      const _path = trimSlashes(path);
      const pathArray = _path.split("/");
      const urlSearchParams = new URLSearchParams(searchParams);
      const url =
        trimSlashes(prefixUrl) + "/" + _path + "?" + urlSearchParams.toString();

      pathArray.forEach((item) => {
        const child = current.getStaticChild(item) || current.getDynamicChild();

        if (!child) {
          throw "Invalid path";
        }

        current = child;
      });

      const routeDef = current.getRoute(method)!._def || null;

      const params: Record<string, string> = routeDef.paths.reduce(
        (acc: any, item, index) => {
          if (item.startsWith(":")) {
            acc[item.replace(":", "")] = pathArray[index];
          }
          return acc;
        },
        {},
      );

      const unValidatedRequest = {
        url,
        method,
        headers,
        params,
        searchParams,
        data,
      };
      for (const [key, value] of unValidatedRequest.searchParams.entries()) {
        const valueArray = Array.isArray(value) ? value : [value];
        unValidatedRequest.searchParams[key] = valueArray;
      }

      let validatedRequest = {
        url,
        method,
        headers,
        params,
        searchParams,
        data,
      };

      async function fn() {
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

              for (const [key, parser] of Object.entries(
                routeDef.searchParams,
              )) {
                const values = unValidatedRequest.searchParams[key];
                const validatedValues = [];

                for (const item of values) {
                  validatedValues.push(await getParseFn(parser)(item));
                }

                validatedSearchParams[key] = validatedValues;
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
        } catch (error) {
          for (const fn of routeDef.errorMiddlewares) {
            let currentCtx = ctx;
            let response = { headers: {} };

            const middlewareResult = await handleMiddleware(
              fn,
              {
                error,
                request: unValidatedRequest,
                response: response,
                ctx: currentCtx,
              },
              routeDef.dataTypes,
            );

            if (!middlewareResult) {
              continue;
            }

            const { ctx: newCtx, isEnd, ...newResponse } = middlewareResult;
            currentCtx = newCtx;
            response = newResponse;

            if (!isEnd) {
              break;
            }
          }
        }

        let currentCtx = ctx;
        let response: any = {
          headers: {},
        };

        const req = {
          headers: validatedRequest.headers,
          method: validatedRequest.method,
          data: validatedRequest.data,
          url: url,
          param(key?: string) {
            return paramFn(validatedRequest.params)(key);
          },
          searchParam(key?: string) {
            return paramFn(validatedRequest.searchParams, true)(key);
          },
          searchParams(key?: string) {
            return paramFn(validatedRequest.searchParams)(key);
          },
        };

        let shouldBreak = false;

        for (const fn of routeDef.middlewares) {
          const middlewareResult = await fn(req, {
            ...response,
            ctx: currentCtx,
            next(nextOptions?: any) {
              return nextEndFunction(
                nextOptions,
                {
                  ...response,
                  ctx: currentCtx,
                },
                routeDef.dataTypes,
              );
            },
            end(endOptions?: any) {
              shouldBreak = true;

              return nextEndFunction(
                endOptions,
                {
                  ...response,
                  ctx: currentCtx,
                },
                routeDef.dataTypes,
              );
            },
          });

          if (!middlewareResult) {
            continue;
          }
          const { ctx, ...newResponse } = middlewareResult;
          currentCtx = ctx;
          response = newResponse;

          if (!shouldBreak) {
            break;
          }
        }

        return response;
      }

      let responsePromise = fn();

      return responsePromise;
    },
  };
}

function nextEndFunction(
  options?: any,
  previousOptions: {
    ctx?: any;
    headers?: any;
    status?: number;
    statusText?: string;
    data?: any;
  } = {
    ctx: {},
    headers: {},
  },
  dataTypes: string[] = [],
) {
  if (!options) {
    return previousOptions;
  }

  const _dataTypes = ["data", ...dataTypes];
  let data: any = previousOptions?.data || null;
  let dataType = undefined;

  for (const item of _dataTypes) {
    if (typeof options[item] !== "undefined") {
      data = options[item];
      dataType = item === "data" ? undefined : item;
      break;
    }
  }

  return {
    ctx: mergeDeep(previousOptions.ctx, options?.ctx),
    headers: mergeHeaders(previousOptions.headers, options?.headers),
    status: options?.status || previousOptions?.status,
    statusText: options?.statusText || previousOptions?.statusText,
    data,
  };
}

// TODO
// implement handleErrorMiddleware and handleMiddleware
// fix types of Param in route.ts types
// implement validation Error

function paramFn(params: Record<string, any>, onlyFirst: boolean = false) {
  return (key?: string) => {
    if (key) {
      const result = params?.[key];

      return onlyFirst ? result?.[0] : result;
    }

    const result = params;

    if (onlyFirst) {
      const onlyFirstResult: Record<string, any> = {};

      Object.entries(result).forEach(([key, value]) => {
        onlyFirstResult[key] = Array.isArray(value) ? value[0] : undefined;
      });

      return onlyFirstResult;
    }

    return result;
  };
}

async function handleMiddleware(
  fn: Function,
  payload: {
    error?: any;
    request: {
      headers: Record<string, string>;
      method: string;
      data: any;
      url: string;
      params: Record<string, unknown>;
      searchParams: Record<string, unknown[]>;
    };
    response: {
      headers: Record<string, string>;
      data?: any;
      status?: number;
      statusText?: string;
    };
    ctx: any;
  },
  dataTypes: string[] = [],
): Promise<MiddlewareResult<any, any> | void> {
  const { request, response, ctx, error } = payload;

  const req = {
    headers: request.headers,
    method: request.method,
    data: request.data,
    url: request.url,
    param(key?: string) {
      return paramFn(request.params)(key);
    },
    searchParam(key?: string) {
      return paramFn(request.searchParams, true)(key);
    },
    searchParams(key?: string) {
      return paramFn(request.searchParams)(key);
    },
  };

  let isEnd = false;

  const res = {
    ...response,
    ctx,
    next(nextOptions?: any) {
      return nextEndFunction(
        nextOptions,
        {
          ...response,
          ctx,
        },
        dataTypes,
      );
    },
    end(endOptions?: any) {
      isEnd = true;

      return nextEndFunction(
        endOptions,
        {
          ...response,
          ctx,
        },
        dataTypes,
      );
    },
  };

  let middlewareResult: MiddlewareResult<any, any>;

  if (error) {
    middlewareResult = await fn(error, req, res);
  } else {
    middlewareResult = await fn(req, res);
  }

  if (middlewareResult) {
    middlewareResult.isEnd = isEnd;
  }

  return middlewareResult;
}
