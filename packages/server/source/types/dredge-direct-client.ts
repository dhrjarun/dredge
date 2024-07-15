import {
  AnyRoute,
  ExtractRoute,
  HTTPMethod,
  inferRouteMethod,
  inferRoutePath,
} from "@dredge/route";
import { IsNever } from "ts-essentials";
import {
  DefaultDredgeClientOptions,
  DredgeClientOptions,
  _inferDredgeClientOption,
  inferDefaultDredgeClientOptions,
  inferDredgeClientOption,
} from "./dredge-client-option";
import { inferDredgeResponsePromise } from "./dredge-client-response";
import { DistributiveOmit, RequiredKeys, Simplify } from "./utils";

export type DirectClientOptions = DredgeClientOptions;
export type DefaultDirectClientOptions = DefaultDredgeClientOptions;

type ParamsForOmit<P> = P extends `:${string}` ? never : "params";

type ResolveRouteShortcutFunction<
  Routes extends AnyRoute[],
  Method extends HTTPMethod,
> = {
  <
    P extends inferRoutePath<ExtractRoute<Routes[number], Method>>,
    R extends ExtractRoute<Routes[number], Method, P>,
  >(
    ...args: IsNever<
      RequiredKeys<
        DistributiveOmit<
          inferDredgeClientOption<R>,
          "method" | ParamsForOmit<P>
        >
      >
    > extends true
      ? [
          path: P,
          options?: Simplify<
            DistributiveOmit<
              _inferDredgeClientOption<R>,
              "method" | ParamsForOmit<P>
            >
          >,
        ]
      : [
          path: IsNever<P> extends true ? string : P,
          options: Simplify<
            DistributiveOmit<
              _inferDredgeClientOption<R>,
              "method" | ParamsForOmit<P>
            >
          >,
        ]
  ): inferDredgeResponsePromise<R>;
};

export type DirectClient<Routes extends AnyRoute[]> = {
  <
    P extends inferRoutePath<Routes[number]>,
    M extends inferRouteMethod<ExtractRoute<Routes[number], any, P>>,
    R extends ExtractRoute<Routes[number], M, P>,
  >(
    path: P,
    options: Simplify<
      { method: M } & DistributiveOmit<
        inferDredgeClientOption<R>,
        "method" | ParamsForOmit<P>
      >
    >,
  ): inferDredgeResponsePromise<R>;

  extends(
    defaultOptions: inferDefaultDredgeClientOptions<Routes>,
  ): DirectClient<Routes>;
} & Pick<MethodClient<Routes>, inferRouteMethod<Routes[number]>>;

interface MethodClient<Routes extends AnyRoute[]> {
  get: ResolveRouteShortcutFunction<Routes, "get">;
  post: ResolveRouteShortcutFunction<Routes, "post">;
  put: ResolveRouteShortcutFunction<Routes, "put">;
  delete: ResolveRouteShortcutFunction<Routes, "delete">;
  patch: ResolveRouteShortcutFunction<Routes, "patch">;
  head: ResolveRouteShortcutFunction<Routes, "head">;
}
