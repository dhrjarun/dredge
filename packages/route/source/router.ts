import type { AnyRoute, DredgeRouter, OverwriteRoutes } from "dredge-types";

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

class DredgeRouterClass<Routes extends AnyRoute[] = []>
  implements DredgeRouter
{
  // readonly routes: Routes;

  root: RoutePath = new RoutePath({
    name: "$root",
  });

  find(method: string, routePathArray: string[]) {
    let current = this.root;

    for (const item of routePathArray) {
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

      const def = route._def;
      const paths = def.paths as string[];

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

      const endRoute = current.getRoute(def.method!);
      if (endRoute) {
        throw new Error(`Duplicate method ${def.method} in the same level`);
      }
      current.setRoute(route);
    });
  }
}

export function dredgeRouter<const T extends (AnyRoute | DredgeRouter)[]>(
  routes: T,
): DredgeRouter<OverwriteRoutes<T>> {
  const router = new DredgeRouterClass(routes as any);

  return router;
}
