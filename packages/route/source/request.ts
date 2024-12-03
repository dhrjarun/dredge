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
  param(key?: string) {
    return paramFn(this.#request.params)(key);
  }
  query(key?: string) {
    return paramFn(this.#request.queries, true)(key);
  }
  queries(key?: string) {
    return paramFn(this.#request.queries)(key);
  }
}

export interface RawRequest {
  url: string;
  method: string;
  dataType?: string;
  data?: any;
  headers: Record<string, string>;
  params: Record<string, any>;
  queries: Record<string, any[]>;
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

function paramFn(params: Record<string, any>, onlyFirst: boolean = false) {
  return (key?: string) => {
    if (key) {
      const result = params?.[key];

      return onlyFirst ? result?.[0] : result;
    }

    const result = params;

    if (onlyFirst) {
      const onlyFirstResult: Record<string, any> = {};

      Object.entries(result).forEach(([key, value]) => {
        onlyFirstResult[key] = Array.isArray(value) ? value[0] : undefined;
      });

      return onlyFirstResult;
    }

    return result;
  };
}
