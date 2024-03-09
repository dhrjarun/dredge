import { Parser, inferParserType } from "./parser";
import type { Route, inferPathType, inferSearchParamsType } from "./route";
type RouteMap = Record<string, AnyRoute>;
import { createBuilder } from "./route";
import z from "zod";

type AnyRoute = Route<any, any, any, any, any>;

interface DredgeApi<T> {
  _routes: Record<string, AnyRoute | RouteMap>;

  addRoutes<const R extends AnyRoute[]>(
    routes: R
  ): DredgeApi<T extends Array<AnyRoute> ? [...T, ...R] : R>;
}

function buildDredgeApi() {
  const _routes = {};

  return {} as DredgeApi<[]>;
}

let userRoute = createBuilder()
  .path("user", ["username", z.enum(["dhrjarun", "dd"])])
  .searchParam({
    size: z.string(),
  })
  .get()
  .resolve(({ send, body, params, searchParams, method }) => {
    return send({
      body: [
        {
          id: "u1",
          username: "dhrjarun",
        },
      ],
    });
  });

let postRoute = createBuilder()
  .path("posts", ["user", z.enum(["dhrjarun", "dd"])])
  .searchParam({
    size: z.string(),
  })
  .post(z.string())
  .resolve(({ send }) => {
    return send({
      body: [{ id: "p1", title: "Post1" }],
    });
  });

const api = buildDredgeApi().addRoutes([userRoute, postRoute]);

type Api = typeof api;

type UserRoute = Api extends DredgeApi<infer R extends AnyRoute[]>
  ? R[0]
  : never;
type PostRoute = Api extends DredgeApi<infer R extends AnyRoute[]>
  ? R[1]
  : never;

type RoutePath<R> = R extends Route<any, any, infer Path, any, any>
  ? Path
  : never;
type RouteSearchParams<R> = R extends Route<
  any,
  any,
  any,
  infer SearchParams,
  any
>
  ? SearchParams
  : never;

type ApiOptions<R> = R extends Route<
  any,
  infer Method,
  infer Path,
  infer SearchParams,
  infer IBody
>
  ? {
      method: Method;
      path: inferPathType<Path>;
      searchParams: inferSearchParamsType<SearchParams>;
      body: inferParserType<IBody>;
    }
  : never;

type inferRoutes<Api> = Api extends DredgeApi<infer Routes extends AnyRoute[]>
  ? Routes
  : never;

//   Api extends DredgeApi<infer Routes extends AnyRoute[]>
//       ? Extract<Routes[number], Route<any, "get", any, any, any>>
//       : never,

type ExtractRouteBy<R, Method, Path extends Array<any> = any> = Extract<
  R,
  Route<any, Method, Path, any, any>
>;

interface DredgeClient<Api extends DredgeApi<any>> {
  get<
    R extends ExtractRouteBy<inferRoutes<Api>[number], "get">,
    P extends RoutePath<R>
  >(
    path: inferPathType<P>,
    options: Omit<
      ApiOptions<ExtractRouteBy<R, any, P>>,
      "method" | "path" | "body"
    >
  );
  put(
    path: Api extends DredgeApi<infer Routes extends AnyRoute[]>
      ? RouteArrayToPathStr<Routes, "put">
      : ""
  );
  delete();
  post<
    R extends ExtractRouteBy<inferRoutes<Api>[number], "post">,
    P extends RoutePath<R>
  >(
    path: inferPathType<P>,
    options: Omit<ApiOptions<ExtractRouteBy<R, any, P>>, "method" | "path">
  );
}

const dredge = {} as DredgeClient<Api>;

dredge.get("user/dd/", {
  searchParams: {
    size: "20",
  },
});
dredge.get("user/dhrjarun/", {
  searchParams: {
    size: "2",
  },
});
dredge.post("posts/dhrjarun/", {
  searchParams: {
    size: "2",
  },
  body: "here is the body",
});

type RouteArrayToPathStr<T, Method extends string = string> = T extends [
  infer First extends AnyRoute,
  ...infer Tail
]
  ? First extends Route<any, infer $Method, infer Path, any, any>
    ? $Method extends Method
      ? inferPathType<Path> | RouteArrayToPathStr<Tail, Method>
      : RouteArrayToPathStr<Tail, Method>
    : ""
  : "";

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
