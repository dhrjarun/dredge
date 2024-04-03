import type { AnyRoute, ResolverResult } from "./route";
import { getParseFn } from "./parser";
import { MaybePromise } from "./types";
import { ClientOptions } from "./client";
import { mergeDeep } from "./utils/merge";

export interface DredgeApi<T> {
  _root: DredgePath;
}

export function buildDredgeApi<const R extends AnyRoute[]>(
  routes: R
): DredgeApi<R> {
  const _root = new DredgePath({
    name: "$root",
  });

  routes.forEach((route) => {
    const def = route._def;
    const paths = def.paths as string[];

    let current = _root;
    paths.forEach((name, index) => {
      if (!current.hasChild(name)) {
        current.addChild(name);
      }
      current = current.getChild(name)!;
    });

    current.setRoute(route);
  });

  return {
    _root,
  } as DredgeApi<[]>;
}

export function dredgeApi<
  Context extends object,
  const R extends AnyRoute[]
>(options: {
  routes: R;
  context: Context;
  transformer: Transformer;
}): DredgeApi<R> {
  const { routes } = options;

  const _root = new DredgePath({
    name: "$root",
  });

  routes.forEach((route) => {
    const def = route._def;
    const paths = def.paths as string[];

    let current = _root;
    paths.forEach((name, index) => {
      if (!current.hasChild(name)) {
        current.addChild(name);
      }
      current = current.getChild(name)!;
    });

    current.setRoute(route);
  });

  return {
    _root,
  } as DredgeApi<[]>;
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
      this.routes[item._def.method || "get"] = item;
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

export async function executeRoute(
  root: DredgePath,
  ctx: object,
  clientOptions: ClientOptions<AnyRoute>
) {
  const { path, searchParams, body, method } = clientOptions;
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
    ...ctx,
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