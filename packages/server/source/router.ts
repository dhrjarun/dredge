import { AnyRoute, MiddlewareResult, Parser, getParseFn } from "@dredge/route";
import { mergeHeaders } from "./utils/headers";
import { mergeDeep } from "./utils/merge";

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

export interface DredgeRouter {
  _def: {
    root: RoutePath;
  };

  call(
    path: string,
    options: {
      headers?: Record<string, string>;
      method?: string;
      data?: any;
      dataType?: string;
      responseDataType?: string;
      searchParams?: Record<string, any>;
      ctx?: any;
      prefixUrl?: string;
      transformData?: boolean | "onlyRequest" | "onlyResponse";
    },
  ): Promise<{
    headers: Record<string, string>;
    status?: number;
    statusText?: string;
    dataType?: string;
    data: any;
  }>;
}

export function dredgeRouter<const Routes extends AnyRoute[]>(
  routes: Routes,
): DredgeRouter {
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

    call: async (path, options) => {
      const {
        method = "get",
        headers = {},
        data: _data = null,
        searchParams = {},
        ctx: _ctx = {},
        prefixUrl = "/",
        dataType,
        transformData = true,
      } = options;

      // TODO: validate path
      let current = root;
      const _path = trimSlashes(path);
      const pathArray = _path.split("/");
      const urlSearchParams = new URLSearchParams(searchParams);
      let url = trimSlashes(prefixUrl) + "/" + _path;
      const search = urlSearchParams.toString();
      if (search) {
        url += "?" + search;
      }

      pathArray.forEach((item) => {
        const child = current.getStaticChild(item) || current.getDynamicChild();

        if (!child) {
          throw "not-found";
        }

        current = child;
      });

      const routeDef = current.getRoute(method)?._def!;
      if (!routeDef) {
        throw "not-found";
      }

      const ctx = {
        ...routeDef.defaultContext,
        ..._ctx,
      };

      // transformRequestData
      const shouldTransformRequestData =
        transformData == true || transformData == "onlyRequest";
      const requestDataTransformer = dataType
        ? routeDef.dataTransformer?.[dataType]?.forRequest ||
          ((data: any) => data)
        : (data: any) => data;
      const data = shouldTransformRequestData
        ? requestDataTransformer(_data)
        : _data;

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
        headers: normalizeHeaders(headers),
        params,
        searchParams,
        data,
      };

      for (const [key, value] of Object.entries(
        unValidatedRequest.searchParams,
      )) {
        const valueArray = Array.isArray(value) ? value : [value];
        unValidatedRequest.searchParams[key] = valueArray;
      }

      let validatedRequest = { ...unValidatedRequest };

      async function fn() {
        try {
          const validatedParams: Record<string, any> = {};
          for (const [key, value] of Object.entries(
            unValidatedRequest.params,
          )) {
            const parser = routeDef.params[key];

            validatedParams[key] = parser
              ? await getValidatorFn(parser, "PARAMS")(value)
              : value;
          }
          validatedRequest.params = validatedParams;

          const validatedSearchParams: Record<string, any> = {};
          for (const [key, parser] of Object.entries(routeDef.searchParams)) {
            const values = unValidatedRequest.searchParams[key];
            const validatedValues = [];

            if (!values) {
              await getValidatorFn(parser, "SEARCH_PARAMS")(undefined);
              continue;
            }

            for (const item of values) {
              validatedValues.push(
                await getValidatorFn(parser, "SEARCH_PARAMS")(item),
              );
            }

            validatedSearchParams[key] = validatedValues;
          }
          validatedRequest.searchParams = validatedSearchParams;

          let validatedData: unknown;
          if (routeDef.iBody) {
            validatedData = await getValidatorFn(routeDef.iBody, "DATA")(data);
            validatedRequest.data = validatedData;
          }

          let currentCtx = ctx;
          let response: any = {
            headers: {},
          };

          for (const fn of routeDef.middlewares) {
            const middlewareResult = await handleMiddleware(
              fn,
              {
                isError: false,
                ctx: currentCtx,
                request: validatedRequest,
                response,
              },
              routeDef.dataTypes,
            );

            if (!middlewareResult) {
              continue;
            }
            const { ctx, isEnd, ...newResponse } = middlewareResult;
            currentCtx = ctx;
            response = newResponse;

            if (isEnd) {
              break;
            }
          }

          return response;
        } catch (error) {
          let response = { headers: {} };
          let currentCtx = ctx;

          for (const fn of routeDef.errorMiddlewares) {
            const middlewareResult = await handleMiddleware(
              fn,
              {
                isError: true,
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

            if (isEnd) {
              break;
            }
          }

          return response;
        }
      }

      let response = await fn();

      // transformResponseData
      const shouldTransformResponseData =
        transformData == true || transformData == "onlyRequest";
      const responseDataTransformer = dataType
        ? routeDef.dataTransformer?.[dataType]?.forResponse ||
          ((data: any) => data)
        : (data: any) => data;
      response.data = shouldTransformResponseData
        ? responseDataTransformer(response.data)
        : _data;

      return response;
    },
  } as DredgeRouter;
}

function nextEndFunction(
  res?: {
    ctx?: any;
    headers?: any;
    status?: number;
    statusText?: string;
    data?: any;
  } & { [key: string]: any },
  previousRes: {
    ctx?: any;
    headers?: any;
    status?: number;
    statusText?: string;
    data?: any;
    dataType?: string;
  } = {
    ctx: {},
    headers: {},
  },
  dataTypes: Record<string, string> = {},
) {
  const generatedHeaders = {};

  if (!res) {
    return previousRes;
  }

  const dataTypeKeys = ["data", ...Object.keys(dataTypes)];
  let data: any = previousRes?.data;
  let dataType = previousRes?.dataType;

  for (const item of dataTypeKeys) {
    if (typeof res[item] !== "undefined") {
      data = res[item];
      dataType = item === "data" ? dataType : item;
      break;
    }
  }

  const mime = dataType ? dataTypes[dataType] : undefined;

  return {
    ctx: mergeDeep(previousRes.ctx, res?.ctx),
    headers: mergeHeaders(previousRes.headers, res?.headers, generatedHeaders),
    status: res?.status || previousRes?.status,
    statusText: res?.statusText || previousRes?.statusText,
    data,
    dataType,
  };
}

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
    isError?: boolean;
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
      dataType?: string;
    };
    ctx: any;
  },
  dataTypes: Record<string, string> = {},
): Promise<MiddlewareResult<any, any> | void> {
  const { request, response, ctx, error, isError = false } = payload;

  const req = {
    header(headerName?: string) {
      if (headerName) {
        return request.headers?.[headerName.toLowerCase()];
      }

      return request.headers;
    },
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
    status: response.status,
    statusText: response.statusText,
    data: response.data,
    dataType: response.dataType,
    ctx,
    header(headerName?: string) {
      if (headerName) {
        return response.headers?.[headerName.toLowerCase()];
      }

      return response.headers;
    },
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

  if (isError) {
    middlewareResult = await fn(error, req, res);
  } else {
    middlewareResult = await fn(req, res);
  }

  if (middlewareResult) {
    middlewareResult.isEnd = isEnd;
  }

  return middlewareResult;
}

export class ValidationError extends Error {
  issue: any;
  type: ValidationType;

  constructor(
    type: "PARAMS" | "SEARCH_PARAMS" | "DATA" | "RESPONSE_DATA",
    issue: any,
  ) {
    super(`Failed at ${type} validation`);

    this.type = type;
    this.issue = issue;
  }
}

function getValidatorFn(parser: Parser, step: ValidationType) {
  return async (value: any) => {
    const fn = getParseFn(parser);
    try {
      return await fn(value);
    } catch (error) {
      throw new ValidationError(step, error);
    }
  };
}

type ValidationType = "PARAMS" | "SEARCH_PARAMS" | "DATA" | "RESPONSE_DATA";

function normalizeHeaders(headers: Record<string, string>) {
  const newHeaders: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    newHeaders[key.toLowerCase()] = value;
  }

  return newHeaders;
}
