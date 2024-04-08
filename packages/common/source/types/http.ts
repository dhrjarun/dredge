export type HTTPMethod = "get" | "post" | "put" | "delete" | "patch" | "head";
import * as http from "http";

export interface Response<T> extends Body<T> {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/headers) */
  readonly headers: Headers;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/ok) */
  readonly ok: boolean;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/redirected) */
  readonly redirected: boolean;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/status) */
  readonly status: number;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/statusText) */
  readonly statusText: string;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/type) */
  readonly type: ResponseType;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/url) */
  readonly url: string;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Response/clone) */
  clone(): Response<T>;
}

interface Body<T> {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Request/body) */
  readonly body: ReadableStream<Uint8Array> | null;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Request/bodyUsed) */
  readonly bodyUsed: boolean;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Request/arrayBuffer) */
  arrayBuffer(): Promise<ArrayBuffer>;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Request/blob) */
  blob(): Promise<Blob>;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Request/formData) */
  formData(): Promise<FormData>;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Request/json) */
  text(): Promise<string>;

  data(): Promise<T>;
}

export type ResponsePromise<T> = Body<T> & Promise<Response<T>>;

export interface ServerRequest extends http.IncomingMessage {
  data: () => Promise<unknown>;
  text: () => Promise<string>;
  buffer: () => Promise<Buffer>;
  formData: () => Promise<FormData>;
}

export interface ServerResponse extends http.ServerResponse {
  writeData: (
    data: any,
    callback?: ((error: Error | null | undefined) => void) | undefined
  ) => boolean;
}
