import { mergeDredgeHeaders } from "dredge-common";
import { RawContext } from "./context";

export class D {
  #context: RawContext;
  #response: RawContext["response"];
  #request: RawContext["request"];
  #next: Function;

  constructor(context: RawContext, next: Function) {
    this.#context = context;
    this.#response = this.#context.response;
    this.#request = this.#context.request;
    this.#next = next;

    for (const item of this.#context.dataTypes.keys()) {
      (this as any)[item] = (data: any) => {
        this.data(data);
        this.dataType(item);
        return this;
      };
    }

    const accpet = this.#context.request.headers["accept"];
    if (accpet) {
      const dataType = this.#context.dataTypes.getDataTypeFromAccept(accpet);
      if (dataType) {
        this.#response.dataType = dataType;
      }
    }

    const contentType = this.#context.request.headers["content-type"];
    if (contentType) {
      const dataType =
        this.#context.dataTypes.getDataTypeFromContentType(contentType);
      if (dataType) {
        this.#context.request.dataType = dataType;
      }
    }
  }

  req(reqUpdate: {
    url?: string;
    method?: string;
    dataType?: string;
    data?: any;
    params?: Record<string, any>;
    queries?: Record<string, any[]>;
    headers?: Record<string, string | null>;
  }) {
    const {
      url = this.#request.url,
      method = this.#request.method,
      dataType = this.#request.dataType,
      data = this.#request.data,
      params = {},
      queries = {},
      headers = {},
    } = reqUpdate;

    this.#request.url = url;
    this.#request.method = method;
    this.#request.dataType = dataType;
    this.#request.data = data;
    this.#request.params = {
      ...this.#request.params,
      ...params,
    };
    this.#request.queries = {
      ...this.#request.queries,
      ...queries,
    };
    this.#request.headers = mergeDredgeHeaders(this.#request.headers, headers);
    return this;
  }

  res<D extends any>(resUpdate: {
    status?: number;
    statusText?: string;
    data?: D;
    dataType?: string;
    headers?: Record<string, string | null>;
  }) {
    const {
      status = this.#response.status,
      statusText = this.#response.statusText,
      data = this.#response.data,
      dataType = this.#response.dataType,
      headers = {},
    } = resUpdate;

    this.#response.status = status;
    this.#response.statusText = statusText;
    this.#response.data = data;
    this.#response.headers = mergeDredgeHeaders(
      this.#response.headers,
      headers,
    );

    if (dataType) {
      this.dataType(dataType);
    }

    return this;
  }

  status(status: number, statusText: string) {
    this.#response.status = status;
    this.#response.statusText = statusText;
    return this;
  }

  data<D extends any>(data: D) {
    this.#response.data = data;
    return this;
  }

  dataType(dataType: string) {
    const dtValue = this.#context.dataTypes.getContentTypeHeader(dataType);
    if (!dtValue) return this;

    this.#response.headers["content-type"] = dtValue;

    this.#response.dataType = dataType;
    return this;
  }

  state<C extends Record<string, any>>(context: C) {
    this.#context.state = {
      ...this.#context.state,
      ...context,
    };
    return this;
  }

  header(headerName: string, value: string | null): this;
  header(headers: Record<string, string | null>): this;
  header(arg1: string | Record<string, string | null>, arg2?: string | null) {
    let newCt: string | null = "";

    if (typeof arg1 === "string") {
      const headers = this.#response.headers;

      if (!headers) return this;
      const name = arg1.toLocaleLowerCase();

      if (name === "content-type") {
        newCt = arg2 || null;
      }

      if (!arg2) {
        delete headers[name];
      } else {
        headers[name] = arg2;
      }
    } else if (typeof arg1 === "object") {
      this.#response.headers = mergeDredgeHeaders(this.#response.headers, arg1);
      newCt = this.#response.headers["content-type"] || "";
    }

    if (newCt) {
      const datatType =
        this.#context.dataTypes.getDataTypeFromContentType(newCt);
      if (datatType) {
        this.#response.dataType = datatType;
      }
    }
    if (newCt === null) {
      this.#response.dataType = undefined;
    }

    return this;
  }

  async next() {
    await this.#next();
    return this;
  }
}
