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
import {
  DredgeResponsePromise,
  inferDredgeResponsePromise,
} from "./dredge-client-response";
import { DistributiveOmit, RequiredKeys, Simplify } from "./utils";

export type DirectClientOptions = DredgeClientOptions;
export type DefaultDirectClientOptions = DefaultDredgeClientOptions;

type ParamsForOmit<P> = P extends `:${string}` ? never : "params";

type DredgeClientShortcutMethod<
  Routes extends AnyRoute[],
  Method extends HTTPMethod,
  Options,
  Response,
> = {
  <
    P extends inferRoutePath<ExtractRoute<Routes[number], Method>>,
    R extends ExtractRoute<Routes[number], Method, P>,
  >(
    ...args: IsNever<
      RequiredKeys<
        DistributiveOmit<
          inferDredgeClientOption<R, Options>,
          "method" | ParamsForOmit<P>
        >
      >
    > extends true
      ? [
          path: P,
          options?: Simplify<
            DistributiveOmit<
              _inferDredgeClientOption<R, Options>,
              "method" | ParamsForOmit<P>
            >
          >,
        ]
      : [
          path: IsNever<P> extends true ? string : P,
          options: Simplify<
            DistributiveOmit<
              _inferDredgeClientOption<R, Options>,
              "method" | ParamsForOmit<P>
            >
          >,
        ]
  ): inferDredgeResponsePromise<R, Response>;
};

export type DredgeClient<Routes, DefaultOptions, Options, Response> =
  Routes extends AnyRoute[]
    ? {
        <
          P extends inferRoutePath<Routes[number]>,
          M extends inferRouteMethod<ExtractRoute<Routes[number], any, P>>,
          R extends ExtractRoute<Routes[number], M, P>,
        >(
          path: P,
          options: Simplify<
            { method: M } & DistributiveOmit<
              inferDredgeClientOption<R, Options>,
              "method" | ParamsForOmit<P>
            >
          >,
        ): inferDredgeResponsePromise<R, Response>;

        extends(
          defaultOptions: inferDefaultDredgeClientOptions<
            Routes,
            DefaultOptions
          >,
        ): DredgeClient<Routes, DefaultOptions, Options, Response>;
      } & Pick<
        MethodClient<Routes, Options, Response>,
        inferRouteMethod<Routes[number]>
      >
    : "Routes should be of valid Type";

interface MethodClient<Routes extends AnyRoute[], Options, Response> {
  get: DredgeClientShortcutMethod<Routes, "get", Options, Response>;
  post: DredgeClientShortcutMethod<Routes, "post", Options, Response>;
  put: DredgeClientShortcutMethod<Routes, "put", Options, Response>;
  delete: DredgeClientShortcutMethod<Routes, "delete", Options, Response>;
  patch: DredgeClientShortcutMethod<Routes, "patch", Options, Response>;
  head: DredgeClientShortcutMethod<Routes, "head", Options, Response>;
}

type AnyResolveRouteShortcutFunction = {
  (
    path: string,
    options?: DirectClientOptions,
  ): DredgeResponsePromise<string, any>;
};
export interface AnyDredgeClient {
  (
    path: string,
    option: DirectClientOptions,
  ): DredgeResponsePromise<string, any>;

  extends(defaultOptions: DefaultDirectClientOptions): AnyDredgeClient;

  get: AnyResolveRouteShortcutFunction;
  post: AnyResolveRouteShortcutFunction;
  put: AnyResolveRouteShortcutFunction;
  delete: AnyResolveRouteShortcutFunction;
  patch: AnyResolveRouteShortcutFunction;
  head: AnyResolveRouteShortcutFunction;
}
