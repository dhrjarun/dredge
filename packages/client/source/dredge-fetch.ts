import {
  FetchOptions,
  DredgeResponsePromise,
  Transformer,
  trimSlashes,
  DredgeResponse,
} from "@dredge/common";

export function dredgeFetch(
  path: string,
  options: Omit<FetchOptions, "path">
): DredgeResponsePromise<any> {
  const { method, headers, searchParams, data } = options;

  const transformer = populateTransformer(options.transformer);

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

  const fetch = options.fetch ?? globalThis.fetch.bind(globalThis);

  if (!options.prefixUrl) {
    throw "No prefix URL provided";
  }
  const prefixUrl =
    options.prefixUrl instanceof URL
      ? options.prefixUrl
      : new URL(options.prefixUrl);

  const url = new URL(prefixUrl);
  url.pathname = trimSlashes(prefixUrl.pathname) + "/" + trimSlashes(path);
  url.search = transformer.searchParams.serialize(searchParams).toString();

  // console.log("req", globalThis.Request);
  console.log("method", method);
  const request = new globalThis.Request(url, {
    method,
    headers,
    body: serializeData(data, headers?.["Content-Type"]),
  });

  async function _function() {
    const response: any = await fetch(request);

    response.data = async () => {
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
    };

    response.json = async () => {
      return transformer.json.deserialize(await response.text());
    };

    return response as DredgeResponse<any>;
  }

  const responsePromise = _function() as DredgeResponsePromise;
  decorateResponsePromise(responsePromise);

  return responsePromise;
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

  constructor(path: string, options: Omit<FetchOptions, "path">) {
    const { transformer = {}, method, headers, searchParams, data } = options;

    this._transformer = populateTransformer(transformer);

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

  static make(path: string, options: FetchOptions): DredgeResponsePromise {
    const dredgeFetch = new DredgeFetch(path, options);

    async function _function() {
      const response: any = await dredgeFetch._getResponse();

      response.data = () => {
        return dredgeFetch._getData(response);
      };

      response.json = async () => {
        return dredgeFetch._transformer.json.deserialize(await response.text());
      };

      return response as DredgeResponse<any>;
    }

    const responsePromise = _function() as DredgeResponsePromise;
    decorateResponsePromise(responsePromise);

    return responsePromise;
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

function decorateResponsePromise(responsePromise: any) {
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

function serializeData(
  data: any,
  options: { contentType?: string; transformer: Transformer }
) {
  const { contentType = "", transformer } = options;

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

async function deserializeData(
  response: Response,
  options: { transformer: Transformer }
) {
  const { transformer } = options;

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

function populateTransformer(
  transformer: Partial<Transformer> = {}
): Transformer {
  const _transformer: Transformer = {
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
  Object.entries(transformer).forEach(([key, value]) => {
    if (value) {
      (_transformer as any)[key] = value;
    }
  });

  return _transformer;
}
