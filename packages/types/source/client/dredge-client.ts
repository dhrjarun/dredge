import {
  AnyRoute,
  ExtractFirstRouteBy,
  ExtractRouteBy,
  ExtractSecondRouteBy,
  HTTPMethod,
  inferRouteFirstPath,
  inferRouteMethod,
  inferRouteSecondPath,
} from "../route";
import { DredgeRouter } from "../router";
import { DistributiveOmit, IsNever, RequiredKeys, Simplify } from "../utils";
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
    P extends inferRouteFirstPath<ExtractRouteBy<Routes[number], Method, any>>,
    R extends ExtractFirstRouteBy<Routes[number], Method, P>,
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

  <
    P extends inferRouteSecondPath<ExtractRouteBy<Routes[number], Method, any>>,
    R extends ExtractSecondRouteBy<Routes[number], Method, P>,
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

export type DredgeClient<Router, DefaultOptions, Options, Response> =
  Router extends DredgeRouter<infer Routes extends AnyRoute[]>
    ? {
        <
          P extends inferRouteFirstPath<
            ExtractRouteBy<Routes[number], any, any>
          >,
          M extends inferRouteMethod<
            ExtractFirstRouteBy<Routes[number], any, P>
          >,
          R extends ExtractFirstRouteBy<Routes[number], M, P>,
        >(
          path: P,
          options: Simplify<
            { method: M } & DistributiveOmit<
              inferDredgeClientOption<R, Options>,
              "method" | ParamsForOmit<P>
            >
          >,
        ): inferDredgeResponsePromise<R, Response>;

        <
          P extends inferRouteSecondPath<
            ExtractRouteBy<Routes[number], any, any>
          >,
          M extends inferRouteMethod<
            ExtractSecondRouteBy<Routes[number], any, P>
          >,
          R extends ExtractSecondRouteBy<Routes[number], M, P>,
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
        ): DredgeClient<Router, DefaultOptions, Options, Response>;
      } & Pick<
        MethodClient<Routes, Options, Response>,
        inferRouteMethod<Routes[number]>
      >
    : "Router should be of valid Type";

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
