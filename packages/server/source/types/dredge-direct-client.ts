import { DredgeClient } from "./dredge-client";
import {
  DefaultDredgeClientOptions,
  DredgeClientOptions,
} from "./dredge-client-option";
import {
  DredgeClientResponse,
  DredgeResponsePromise,
} from "./dredge-client-response";

export type DirectClientOptions = DredgeClientOptions & {
  serverCtx?: Record<string, any>;
};
export type DefaultDirectClientOptions = DefaultDredgeClientOptions & {
  serverCtx?: Record<string, any>;
};
export type DirectClientResponse<T = any> = DredgeClientResponse<T>;

export type DirectClientResponsePromise<DataTypes, Data> =
  DredgeResponsePromise<DataTypes, Data>;

export type DirectClient<Routes> = DredgeClient<
  Routes,
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
