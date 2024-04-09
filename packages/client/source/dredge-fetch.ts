import {
  ClientOptions,
  ResponsePromise,
  Transformer,
  trimSlashes,
  Response as DredgeResponse,
} from "@dredge/common";

const defaultTransformer: Transformer = {
  json: {
    serialize: JSON.stringify,
    deserialize: JSON.parse,
  },
  formData: {
    serialize: (object) => {
      const formData = new FormData();
      Object.entries(object).forEach(([key, value]) => {
        if (typeof value === "string" || value instanceof Blob) {
          formData.append(key, value);
        } else {
          throw "serialization failed";
        }
      });

      return formData;
    },
    deserialize: (object) => {
      return Object.fromEntries(object.entries());
    },
  },
  searchParams: {
    serialize: (object) => new URLSearchParams(object),
    deserialize: (object) => Object.fromEntries(object.entries()),
  },
};

export async function dredgeFetch(path: string, options: ClientOptions) {
  const { method, headers, searchParams, data } = options;

  const transformer = defaultTransformer;
  function serializeData(data: any, contentType: string = "") {
    if (contentType.startsWith("application/json")) {
      return transformer.json.serialize(data);
    }

    if (contentType.startsWith("multipart/form-data")) {
      return transformer.json.serialize(data);
    }

    if (contentType?.startsWith("application/x-www-form-urlencoded")) {
      return transformer.json.serialize(data);
    }

    return data;
  }

  Object.entries(options?.transformer || {}).forEach(([key, value]) => {
    if (value) {
      (transformer as any)[key] = value;
    }
  });

  const fetch = options.fetch ?? globalThis.fetch.bind(globalThis);

  if (!options.prefixUrl) {
    throw "No prefix URL provided";
  }
  const prefixUrl =
    options.prefixUrl instanceof URL
      ? options.prefixUrl
      : new URL(options.prefixUrl);

  const url = new URL({
    ...prefixUrl,
    pathname: prefixUrl.pathname + "/" + trimSlashes(path),
    searchParams: transformer.searchParams.serialize(searchParams),
  });

  const request = new globalThis.Request(url, {
    method,
    headers,
    body: serializeData(data, headers?.["Content-Type"]),
  });

  const response = await fetch(request);

  const { json, ...restResponseFields } = response;
  const promiseResponse = Promise.resolve({
    ...restResponseFields,
    data: dataFn,
    clone() {
      return { ...this };
    },
  }) as unknown as ResponsePromise;

  promiseResponse.data = dataFn;
  promiseResponse.formData = response.formData;
  promiseResponse.text = response.text;
  promiseResponse.arrayBuffer = response.arrayBuffer;

  return promiseResponse;
  async function dataFn() {
    const contentType = response.headers.get("Content-Type");
    let data: any;

    if (contentType?.startsWith("application/json")) {
      data = transformer.json.deserialize(await response.text());
    }
    if (contentType?.startsWith("multipart/form-data")) {
      data = transformer.formData.deserialize(await response.formData());
    }

    if (contentType?.startsWith("application/x-www-form-urlencoded")) {
      const searchParams = new URLSearchParams(await response.text());
      data = transformer.searchParams.deserialize(searchParams);
    }

    if (response.ok) {
      return Promise.resolve(data);
    } else {
      return Promise.reject(data);
    }
  }
}

export class DredgeFetch {
  protected _transformer: Transformer = {
    json: {
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    },
    formData: {
      serialize: (object) => {
        const formData = new FormData();
        Object.entries(object).forEach(([key, value]) => {
          if (typeof value === "string" || value instanceof Blob) {
            formData.append(key, value);
          } else {
            throw "serialization failed";
          }
        });

        return formData;
      },
      deserialize: (object) => {
        return Object.fromEntries(object.entries());
      },
    },
    searchParams: {
      serialize: (object) => new URLSearchParams(object),
      deserialize: (object) => Object.fromEntries(object.entries()),
    },
  };

  protected _fetch: (
    input: string | URL | globalThis.Request,
    init?: RequestInit
  ) => Promise<Response>;

  request: globalThis.Request;

  constructor(path: string, options: Omit<ClientOptions, "path">) {
    const { transformer = {}, method, headers, searchParams, data } = options;

    Object.entries(transformer).forEach(([key, value]) => {
      if (value) {
        (this._transformer as any)[key] = value;
      }
    });

    this._fetch = options.fetch ?? globalThis.fetch.bind(globalThis);

    if (!options.prefixUrl) {
      throw "No prefix URL provided";
    }
    const prefixUrl =
      options.prefixUrl instanceof URL
        ? options.prefixUrl
        : new URL(options.prefixUrl);

    const url = new URL({
      ...prefixUrl,
      pathname: prefixUrl.pathname + "/" + trimSlashes(path),
      searchParams: this._transformer.searchParams.serialize(searchParams),
    });

    this.request = new globalThis.Request(url, {
      method,
      headers,
      body: this._serializeData(data, headers?.["Content-Type"]),
    });
  }

  static make(path: string, options: ClientOptions): ResponsePromise {
    const dredgeFetch = new DredgeFetch(path, options);

    async function _function() {
      const response = await dredgeFetch._getResponse();
      const { json, ...rest } = response;

      const dredgeResponse: DredgeResponse = {
        ...rest,
        data: () => {
          return dredgeFetch._getData(response);
        },
        clone: () => {
          return { ...dredgeResponse };
        },
      };
      return dredgeResponse;
    }

    const responsePromise = _function() as ResponsePromise;
    dredgeFetch._decorateResponse(responsePromise);

    return responsePromise;
  }

  protected _decorateResponse(responsePromise: any) {
    responsePromise.data = async () => {
      return (await responsePromise).data();
    };
    responsePromise.formData = async () => {
      return (await responsePromise).formData();
    };
    responsePromise.arrayBuffer = async () => {
      return (await responsePromise).arrayBuffer();
    };
    responsePromise.blob = async () => {
      return (await responsePromise).blob();
    };
  }

  protected _getResponse() {
    return this._fetch(this.request);
  }

  protected async _getData(response: Response) {
    const contentType = response.headers.get("Content-Type");
    let data: any;

    if (contentType?.startsWith("application/json")) {
      data = this._transformer.json.deserialize(await response.text());
    }
    if (contentType?.startsWith("multipart/form-data")) {
      data = this._transformer.formData.deserialize(await response.formData());
    }

    if (contentType?.startsWith("application/x-www-form-urlencoded")) {
      const searchParams = new URLSearchParams(await response.text());
      data = this._transformer.searchParams.deserialize(searchParams);
    }

    if (response.ok) {
      return Promise.resolve(data);
    } else {
      return Promise.reject(data);
    }
  }

  protected _serializeData(data: any, contentType: string = "") {
    if (contentType.startsWith("application/json")) {
      return this._transformer.json.serialize(data);
    }

    if (contentType.startsWith("multipart/form-data")) {
      return this._transformer.json.serialize(data);
    }

    if (contentType?.startsWith("application/x-www-form-urlencoded")) {
      return this._transformer.json.serialize(data);
    }

    return data;
  }
}
