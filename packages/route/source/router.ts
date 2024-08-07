import { AnyRoute } from "@dredge/types";

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

export interface DredgeRouter {
  _def: {
    root: RoutePath;
  };

  find(method: string, path: string[]): AnyRoute;
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

    find: (method: string, routePathArray: string[]) => {
      let current = root;

      routePathArray.forEach((item) => {
        const child = current.getStaticChild(item) || current.getDynamicChild();

        if (!child) {
          throw "not-found";
        }

        current = child;
      });

      const route = current.getRoute(method);
      if (!route) {
        throw "not-found";
      }

      return route;
    },
  } as DredgeRouter;
}
