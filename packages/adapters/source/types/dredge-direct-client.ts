// import {
//   DefaultDredgeClientOptions,
//   DredgeClientOptions,
// } from "./dredge-client-option";
// import {
//   DredgeClientResponse,
//   DredgeResponsePromise,
// } from "./dredge-client-response";
import {
  DefaultDredgeClientOptions,
  DredgeClient,
  DredgeClientOptions,
  DredgeClientResponse,
  DredgeResponsePromise,
} from "@dredge/route";
import { MarkRequired } from "ts-essentials";

export type DirectClientOptions = DredgeClientOptions & {
  serverCtx?: Record<string, any>;
};

export type NormalizedDirectClientOptions = MarkRequired<
  DirectClientOptions,
  | "serverCtx"
  | "method"
  | "dataTypes"
  | "searchParams"
  | "params"
  | "throwHttpErrors"
  | "headers"
> & {
  path: string;
  prefixUrl?: string;
};

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
