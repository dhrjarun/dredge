import { MimeStore } from "dredge-common";
import type {
  DefaultFieldInDirectClientOptions,
  DredgeClientOptions,
  MarkRequired,
  MaybePromise,
} from "dredge-types";
import { HTTPError } from "../errors/HTTPError";

export interface FetchOptions
  extends Omit<DredgeClientOptions, "headers">,
    Omit<RequestInit, "body" | "method"> {
  ctx?: Record<string, any>;
  fetch?: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>;
  hooks?: Partial<Hooks>;
  dataSerializers?:
    | {
        [key: string]: DataSerializerFunction;
      }
    | MimeStore<DataSerializerFunction>;
  bodyParsers?:
    | {
        [key: string]: BodyParserFunction;
      }
    | MimeStore<BodyParserFunction>;
  serializeParams?: (params: Record<string, any>) => Record<string, string>;
  serializeSearchParams?: (
    searchParams: Record<string, any[]>,
  ) => Record<string, string[]>;
}

type DataSerializerFunction = (options: {
  readonly data: any;
  mediaType: string;
  boundary?: string;
  charset?: string;
}) => MaybePromise<
  ArrayBuffer | Blob | string | FormData | ReadableStream<Uint8Array>
>;

type BodyParserFunction = (options: {
  readonly body: ReadableStream<Uint8Array>;
  text(): Promise<string>;
  blob(): Promise<Blob>;
  formData(): Promise<FormData>;
  arrayBuffer(): Promise<ArrayBuffer>;
  readonly bodyUsed: boolean;

  readonly mediaType: string;
  readonly boundary?: string;
  readonly charset?: string;
}) => MaybePromise<any>;

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
    | "params"
    | "throwHttpErrors"
    | "serializeParams"
    | "serializeSearchParams"
  > {
  searchParams: Record<string, any[]>;
  headers: Headers;
  path: string;
  prefixUrl: string;
  hooks: Hooks;
  dataSerializers: MimeStore<DataSerializerFunction>;
  bodyParsers: MimeStore<BodyParserFunction>;
}

export interface Hooks {
  init: InitHook[];
  beforeRequest: BeforeRequestHook[];
  afterResponse: AfterResponseHook[];
  beforeError: BeforeErrorHook[];
}

export type DefaultFetchOptions = Pick<
  FetchOptions,
  | DefaultFieldInDirectClientOptions
  | "fetch"
  | "referrer"
  | "hooks"
  | "ctx"
  | "dataSerializers"
  | "bodyParsers"
  | "serializeParams"
  | "serializeSearchParams"
>;
