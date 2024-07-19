import type {
  DefaultFieldInDirectClientOptions,
  DredgeClientOptions,
} from "@dredge/server";
import { MarkRequired } from "ts-essentials";
import { HTTPError } from "../errors/HTTPError";

export interface FetchOptions
  extends Omit<DredgeClientOptions, "headers">,
    Omit<RequestInit, "body" | "method"> {
  fetch?: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>;
  hooks?: Partial<Hooks>;
}

export type InitHook = (options: NormalizedFetchOptions) => void;

export type BeforeRequestHook = (
  options: NormalizedFetchOptions,
  request: globalThis.Request,
) =>
  | globalThis.Request
  | Response
  | void
  | Promise<globalThis.Request | Response | void>;

export type AfterResponseHook<DataTypes extends string[] = []> = (
  options: NormalizedFetchOptions,
  request: globalThis.Request,
  response: globalThis.Response,
) => globalThis.Response | void | Promise<globalThis.Response | void>;

export type BeforeErrorHook = (
  error: HTTPError,
) => HTTPError | Promise<HTTPError>;

export interface NormalizedFetchOptions
  extends MarkRequired<
    FetchOptions,
    | "ctx"
    | "method"
    | "dataTypes"
    | "fetch"
    | "searchParams"
    | "params"
    | "throwHttpErrors"
    | "dataTransformer"
  > {
  headers: Headers;
  path: string;
  prefixUrl: URL;
  hooks: Hooks;
}

export interface Hooks {
  init: InitHook[];
  beforeRequest: BeforeRequestHook[];
  afterResponse: AfterResponseHook[];
  beforeError: BeforeErrorHook[];
}

export type DefaultFetchOptions = Pick<
  FetchOptions,
  DefaultFieldInDirectClientOptions | "fetch" | "referrer" | "hooks"
>;
