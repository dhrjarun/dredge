import {
  inferPathType,
  inferSearchParamsType,
  AnyRoute,
  Route,
  createRouteBuilder,
} from "./route";
import { Parser, inferParserType } from "./parser";
import { DredgeApi, buildDredgeApi } from "./api";
import z from "zod";

type ClientOptions<R> = R extends Route<
  any,
  infer Method,
  infer Path,
  any,
  infer SearchParams extends Record<string, Parser>,
  infer IBody
>
  ? {
      method: Method;
      path: inferPathType<Path, SearchParams>;
      searchParams: inferSearchParamsType<SearchParams>;
      body: inferParserType<IBody>;
    }
  : never;

type inferRoutes<Api> = Api extends DredgeApi<infer Routes extends AnyRoute[]>
  ? Routes
  : never;

type ExtractRouteBy<R, Method, Path extends Array<any> = any> = Extract<
  R,
  Route<any, Method, Path, any, any>
>;

interface DredgeClient<Api extends DredgeApi<any>> {
  get<
    R extends ExtractRouteBy<inferRoutes<Api>[number], "get">,
    P extends RoutePath<R>
  >(
    path: inferPathType<P, RouteParams<R>>,
    options: Omit<
      ClientOptions<ExtractRouteBy<R, any, P>>,
      "method" | "path" | "body"
    >
  );
  post<
    R extends ExtractRouteBy<inferRoutes<Api>[number], "post">,
    P extends RoutePath<R>
  >(
    path: inferPathType<P, RouteParams<R>>,
    options: Omit<ClientOptions<ExtractRouteBy<R, any, P>>, "method" | "path">
  );

  // put(
  //   path: Api extends DredgeApi<infer Routes extends AnyRoute[]>
  //     ? RouteArrayToPathStr<Routes, "put">
  //     : ""
  // );
  // delete();
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

// type RouteArrayToPathStr<T, Method extends string = string> = T extends [
//   infer First extends AnyRoute,
//   ...infer Tail
// ]
//   ? First extends Route<any, infer $Method, infer Path, any, any>
//     ? $Method extends Method
//       ? inferPathType<Path> | RouteArrayToPathStr<Tail, Method>
//       : RouteArrayToPathStr<Tail, Method>
//     : ""
//   : "";

let userRoute = createRouteBuilder()
  .path("user", ":username")
  .params({
    username: z.enum(["dhrjarun", "dd"]),
  })
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

let postRoute = createRouteBuilder()
  .path("posts", ":user")
  .params({
    user: z.enum(["dhrjarun", "dd"]),
  })
  .searchParam({
    size: z.string(),
  })
  .post(z.string())
  .resolve(({ send }) => {
    return send({
      body: [{ id: "p1", title: "Post1" }],
    });
  });

const api = buildDredgeApi([userRoute, postRoute]);

type Api = typeof api;

type RoutePath<R> = R extends Route<any, any, infer Path, any, any>
  ? Path
  : never;

type RouteParams<R> = R extends Route<
  any,
  any,
  any,
  infer Params extends Record<string, Parser>,
  any,
  any
>
  ? Params
  : never;
type RouteSearchParams<R> = R extends Route<
  any,
  any,
  any,
  any,
  infer SearchParams,
  any
>
  ? SearchParams
  : never;
