import type {
  AnyRoute,
  AnyValidRoute,
  DredgeRouter,
  OverwriteRoutes,
} from "dredge-types";

export function getPathParams(routePath: string[]) {
  return (pathArray: string[]) => {
    const params: Record<string, string> = routePath.reduce(
      (acc: any, item: string, index: number) => {
        if (item.startsWith(":")) {
          acc[item.replace(":", "")] = pathArray[index];
        }
        return acc;
      },
      {},
    );

    return params;
  };
}

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
      const method = item._schema.method || "get";
      this.routes.set(method, item);
    });
  }

  hasStaticChild(name: string) {
    return this.children.has(name);
  }

  getRoute(method: string) {
    return this.routes.get(method.toLowerCase());
  }
  setRoute(route: AnyRoute) {
    const method = route._schema.method || "get";
    this.routes.set(method, route);
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

class DredgeRouterClass implements DredgeRouter {
  root: RoutePath = new RoutePath({
    name: "$root",
  });

  find(method: string, paths: string[]) {
    let current = this.root;

    if (!method) {
      return null;
    }

    for (const item of paths) {
      const child = current.getStaticChild(item) || current.getDynamicChild();

      if (!child) {
        return null;
      }

      current = child;
    }

    const route = current.getRoute(method);
    if (!route) {
      return null;
    }

    return route;
  }

  constructor(routes: (AnyRoute | DredgeRouterClass)[]) {
    routes.forEach((route) => {
      if (route instanceof DredgeRouterClass) {
        route.root.children.forEach((child, name) => {
          this.root.children.set(name, child);
        });

        return;
      }

      const method = route._schema.method;
      const paths = route._schema.paths;

      let current = this.root;
      paths.forEach((name) => {
        const child = current.getChild(name);
        if (child && child.isParam && child.name !== name.slice(1)) {
          throw new Error(`Duplicate dynamic path ${name} in the same level`);
        }

        if (!child) {
          current.addChild(name);
        }
        current = current.getChild(name)!;
      });

      const endRoute = current.getRoute(method!);
      if (endRoute) {
        throw new Error(`Duplicate method ${method} in the same level`);
      }

      if (!paths.length) {
        throw TypeError("Invalid route - Paths are not defined");
      }
      if (!method) {
        throw TypeError("Invalid route - Method is not defined");
      }

      current.setRoute(route);
    });
  }
}

export function dredgeRouter<const T extends (AnyValidRoute | DredgeRouter)[]>(
  routes: T,
): DredgeRouter<OverwriteRoutes<T>> {
  const router = new DredgeRouterClass(routes as any);

  return router;
}
