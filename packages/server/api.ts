import type { AnyRoute } from "./route";

type RouteMap = Record<string, AnyRoute>;

export interface DredgeApi<T> {
  _root: Path;
  // _routes: Record<string, AnyRoute | RouteMap>;

  // addRoutes<const R extends AnyRoute[]>(
  //   routes: R
  // ): DredgeApi<T extends Array<AnyRoute> ? [...T, ...R] : R>;

  // caller(): Function;
}

export function buildDredgeApi<const R extends AnyRoute[]>(
  routes: R
): DredgeApi<R> {
  const _root = new Path({
    name: "$root",
  });

  routes.forEach((route) => {
    const def = route._def;
    const paths = def.paths as string[];

    let current = _root;
    paths.forEach((name, index) => {
      const isLast = index + 1 == paths.length;

      if (!current.hasChild(name)) {
        // current.addChild(name, isLast ? route : undefined);
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

class Path {
  name: string;
  isParam: boolean;

  routes = new Map<string, AnyRoute>();

  children: Map<string, Path>;
  dynamicChild: Path | null = null;

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
    this.children.has(name);
  }

  getRoute(method: string) {
    return this.routes.get(method);
  }
  setRoute(route: AnyRoute) {
    this.routes[route._def.method || "get"] = route;
  }

  hasChild(name: string) {
    if (name.startsWith(":")) {
      return this.hasDynamicChild();
    }

    return this.hasStaticChild(name);
  }

  hasDynamicChild() {
    return this.dynamicChild!!;
  }

  // execute: ()

  // addChild(path: Path) {
  //   if (path.isParam && this.dynamicChild) {
  //     throw "Dynamic Path already exist..";
  //   }

  //   if (path.isParam) {
  //     this.dynamicChild = path;
  //     return;
  //   }

  //   this.children.set(path.name, path);
  // }

  addChild(name: string, routes?: AnyRoute[]) {
    if (name.startsWith(":")) {
      this.dynamicChild = new Path({
        name: name.replace(":", ""),
        isParam: true,
        routes,
      });
    }

    this.children.set(
      name,
      new Path({
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

// type FilterRouteArrayByMethod<T, Method extends string> = T extends [
//   infer First extends AnyRoute,
//   ...infer Tail
// ]
//   ? First extends Route<any, Method, any, any, any>
//     ? RoutePathToStr<Path> | RouteArrayToPathStr<Tail>
//     : ""
//   : "";

// class DredgeApi {
//   routes: Record<string, AnyRoute | RouteMap>;

//   bodyTransformer: unknown;
//   queryTransformer: unknown;

//   caller() {
//     let routes = this.routes;
//     return function (
//       url: string,
//       options: {
//         body: any;
//         header: Record<string, string>;
//       }
//     ) {
//       // check if valid url
//       const u = new URL(url);

//       const paths = u.pathname.split("/");

//       paths.forEach((item, index) => {
//         const r = routes[item] || routes["$"];
//         if (!r) {
//           throw new Error("NOT Found");
//         }

//         if (index === paths.length - 1) {
//           // check if r is of Route type
//           // if r is of router type then execute it also check method and
//           // else throw error
//         }

//         // if r is of not of desired type throw
//       });
//     };
//   }
// }
