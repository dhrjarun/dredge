import { getParseFn } from "@dredge/common";
import type {
  AnyDredgeApi,
  AnyRoute,
  ApiBuilderDef,
  ParsedRequest,
  ParsedResponse,
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
    routes,
    inputTransformers,
    outputTransformers,
    errorMiddlewares,
  };

  const rootPath: DredgePath | null = null;

  const builder = {
    _def: def,

    routes: (routes) => {
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
      return "" as any;
    },
  } as AnyDredgeApi;

  return builder;
}

export async function resolveRouteWithoutTransforms(
  root: DredgePath,
  request: Omit<ParsedRequest, "params"> & {
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
