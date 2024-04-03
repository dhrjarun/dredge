export type HTTPMethod = "get" | "post" | "put" | "delete" | "patch" | "head";

export type PlainResponse = {
  method: HTTPMethod;
  url: URL;
  body: ReadableStream<Uint8Array> | null; // same as fetch
  headers: Record<string, string>;
  status: number;
  statusText: string;
};

export interface Response<T> extends PlainResponse {
  data: T;
}
