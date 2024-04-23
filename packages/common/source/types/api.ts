import {
  inferRoutePath,
  inferRouteMethod,
  ExtractRoute,
  isAnyRoute,
  AnyRoute,
  ResolverOptions,
  inferResolverOption,
  inferResolverResultPromise,
} from "./route";
import { Simplify } from "./utils";
import { HTTPMethod } from "./http";

// export interface DredgeApi<T> {
//   _root: any;
// }

export type inferRoutes<Api> = Api extends DredgeApi<
  any,
  infer Routes
  // infer Routes extends AnyRoute[]
>
  ? Routes
  : never;
export type inferRouteUnion<Api> = inferRoutes<Api>[number];

export interface ResolveRoute<
  Context extends object,
  Routes extends AnyRoute[],
> {
  <
    P extends inferRoutePath<Routes[number]>,
    M extends inferRouteMethod<ExtractRoute<Routes[number], any, P>>,
    R extends ExtractRoute<Routes[number], M, P>,
  >(
    path: P,
    options: isAnyRoute<R> extends true
      ? Omit<ResolverOptions, "path">
      : Simplify<
          { method: M } & Omit<
            inferResolverOption<R>,
            "path" | "method" | "ctx"
          > &
            (keyof Context extends never ? {} : { ctx: Context })
        >,
  ): inferResolverResultPromise<R>;
}

export interface DredgeApi<Context extends object, Routes extends AnyRoute[]> {
  _def: {
    root: any;
  };

  resolveRoute: ResolveRoute<Context, Routes>;
}
export type DredgeResolverOptions<Context> = {
  ctx?: Context;
  method?: HTTPMethod | string;
  data?: any;
  path: string;
  headers?: Record<string, string | string[] | undefined>;
  searchParams?: Record<string, any>;
};
