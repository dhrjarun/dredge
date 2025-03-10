import type { RawRequest } from "dredge-types";

export class DredgeRequest {
  #request: RawRequest;

  constructor(request: RawRequest) {
    this.#request = request;
  }

  get url() {
    return this.#request.url;
  }
  get method() {
    return this.#request.method;
  }
  get dataType() {
    return this.#request.dataType;
  }
  get data() {
    return this.#request.data;
  }
  get headers() {
    return this.#request.headers;
  }
  get params() {
    return this.#request.params;
  }
}

export function headerFn(headers: Record<string, string>) {
  return function (headerName?: string) {
    if (headerName) {
      const name = headerName?.toLocaleLowerCase();
      if (!Object.hasOwn(headers, name)) return null;
      return headers?.[name] ?? null;
    }

    return headers;
  };
}
