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
  header(headerName?: string) {
    return headerFn(this.#request.headers)(headerName) as any;
  }
  param(key?: string): any {
    if (key) {
      const param = this.#request.params[`:${key}`];
      const queryParam = this.#request.params[`?${key}`]?.[0];

      return param ?? queryParam;
    }

    const result: any = {};
    Object.entries(this.#request.params).forEach(([key, value]) => {
      result[key.slice(1)] = Array.isArray(value) ? value[0] : value;
    });
    return result;
  }
  params(key?: string): any[] {
    if (key) {
      let param = this.#request.params[`:${key}`];
      const queryParam = this.#request.params[`?${key}`];

      param = param ? [param] : [];
      return queryParam ?? param;
    }

    const result: any = {};
    Object.entries(this.#request.params).forEach(([key, value]) => {
      if (key.startsWith(":")) {
        result[key.slice(1)] = [value];
      } else {
        result[key.slice(1)] = value;
      }
    });
    return result;
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
