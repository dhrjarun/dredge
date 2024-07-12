import {
  AnyRoute,
  ExtractRoute,
  HTTPMethod,
  inferRouteMethod,
  inferRoutePath,
} from "@dredge/common";
import { IsNever } from "ts-essentials";
import {
  _inferDredgeClientOption,
  inferDefaultDredgeClientOptions,
  inferDredgeClientOption,
} from "./dredge-client-option";
import { inferDredgeResponsePromise } from "./dredge-client.response";
import { DistributiveOmit, RequiredKeys, Simplify } from "./utils";

type ResolveRouteShortcutFunction<
  Routes extends AnyRoute[],
  Method extends HTTPMethod,
> = {
  <
    P extends inferRoutePath<ExtractRoute<Routes[number], Method>>,
    R extends ExtractRoute<Routes[number], Method, P>,
  >(
    ...args: IsNever<
      RequiredKeys<Omit<inferDredgeClientOption<R>, "method">>
    > extends true
      ? [
          path: P,
          options?: Simplify<
            DistributiveOmit<_inferDredgeClientOption<R>, "method">
          >,
        ]
      : [
          path: IsNever<P> extends true ? string : P,
          options: Simplify<
            DistributiveOmit<_inferDredgeClientOption<R>, "method">
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
      { method: M } & DistributiveOmit<inferDredgeClientOption<R>, "method">
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
