import { MarkRequired } from "@dredge/common";
import { HTTPError } from "../errors/HTTPError";

type Context = Record<string, any>;

export type FetchOptions = {
  fetch?: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>;
  dataTypes?: string[];
  prefixUrl?: URL | string;
  responseDataType?: string;
  ctx?: Context;
  stringify?: (
    data: any,
    options: {
      readonly url: string;
      readonly method: string;
      readonly headers: Headers;
      readonly dataType?: string;
      ctx: Context;
    },
  ) => BodyInit | null;
  parse?: (
    body: ReadableStream<Uint8Array> | null,
    options: {
      readonly url: string;
      readonly headers: Headers;
      readonly status: number;
      readonly statusText: string;
      readonly dataType?: string;
      ctx: Context;
    },
  ) => any;
  hooks?: Partial<Hooks>;
  throwHttpErrors?: boolean;
} & DredgeRequestInit;

interface DredgeRequestInit extends Omit<RequestInit, "body"> {
  searchParams?: Record<string, string | string[]>;
  data?: any;
  dataType?: string;
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
    | "stringify"
    | "parse"
    | "searchParams"
    | "throwHttpErrors"
  > {
  path: string;
  headers: Headers;
  prefixUrl: URL;
  hooks: Hooks;
}

interface Hooks {
  init: InitHook[];
  beforeRequest: BeforeRequestHook[];
  afterResponse: AfterResponseHook[];
  beforeError: BeforeErrorHook[];
}

export type DefaultFetchOptions = Pick<
  FetchOptions,
  | "fetch"
  | "headers"
  | "dataTypes"
  | "ctx"
  | "throwHttpErrors"
  | "referrer"
  | "hooks"
> & {
  prefixUrl?: string | URL;
};
