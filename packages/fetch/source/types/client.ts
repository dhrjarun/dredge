import type { DredgeClient } from "@dredge/types";
import { DefaultFetchOptions, FetchOptions } from "./options";
import { FetchResponse, FetchResponsePromise } from "./response";

export type DredgeFetchClient<Router> = DredgeClient<
  Router,
  DefaultFetchOptions,
  FetchOptions,
  FetchResponse
>;

type AnyFetchClientShortcutMethod = {
  (path: string, options?: FetchOptions): FetchResponsePromise<string, any>;
};
export interface AnyDredgeFetchClient {
  (path: string, option: FetchOptions): FetchResponsePromise<string, any>;

  extends(defaultOptions: DefaultFetchOptions): AnyDredgeFetchClient;

  get: AnyFetchClientShortcutMethod;
  post: AnyFetchClientShortcutMethod;
  put: AnyFetchClientShortcutMethod;
  delete: AnyFetchClientShortcutMethod;
  patch: AnyFetchClientShortcutMethod;
  head: AnyFetchClientShortcutMethod;
}
