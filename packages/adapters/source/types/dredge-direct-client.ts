import {
  DefaultDredgeClientOptions,
  DredgeClient,
  DredgeClientOptions,
  DredgeClientResponse,
  DredgeResponsePromise,
  MarkRequired,
} from "dredge-types";

export type DirectClientOptions = DredgeClientOptions & {
  serverCtx?: Record<string, any>;
};

//TODO: Fix after `&` types
export interface NormalizedDirectClientOptions
  extends MarkRequired<
    DirectClientOptions,
    | "serverCtx"
    | "method"
    | "dataTypes"
    | "params"
    | "throwHttpErrors"
    | "headers"
  > {
  path: string;
  prefixUrl?: string;
  queries: Record<string, any[]>;
}

export type DefaultDirectClientOptions = DefaultDredgeClientOptions & {
  serverCtx?: Record<string, any>;
};
export type DirectClientResponse<T = any> = DredgeClientResponse<T> & {
  ok: boolean;
};

export type DirectClientResponsePromise<DataTypes, Data> =
  DredgeResponsePromise<DataTypes, Data>;

export type DirectClient<Router> = DredgeClient<
  Router,
  DefaultDirectClientOptions,
  DirectClientOptions,
  DirectClientResponse
>;

type AnyResolveRouteShortcutFunction = {
  (
    path: string,
    options?: DirectClientOptions,
  ): DirectClientResponsePromise<string, any>;
};
export interface AnyDirectClient {
  (
    path: string,
    option: DirectClientOptions,
  ): DirectClientResponsePromise<string, any>;

  extends(defaultOptions: DefaultDirectClientOptions): AnyDirectClient;

  get: AnyResolveRouteShortcutFunction;
  post: AnyResolveRouteShortcutFunction;
  put: AnyResolveRouteShortcutFunction;
  delete: AnyResolveRouteShortcutFunction;
  patch: AnyResolveRouteShortcutFunction;
  head: AnyResolveRouteShortcutFunction;
}
