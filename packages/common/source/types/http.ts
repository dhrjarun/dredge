export type HTTPMethod = "get" | "post" | "put" | "delete" | "patch" | "head";

export interface DredgeResponse<T> extends globalThis.Response {
  data(): Promise<T>;
}
export type DredgeResponsePromise<T = any> = {
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Request/arrayBuffer) */
  arrayBuffer(): Promise<ArrayBuffer>;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Request/blob) */
  blob(): Promise<Blob>;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Request/formData) */
  formData(): Promise<FormData>;
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/Request/json) */
  text(): Promise<string>;

  data(): Promise<T>;
} & Promise<DredgeResponse<T>>;
