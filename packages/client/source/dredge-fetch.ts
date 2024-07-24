import { HTTPError } from "./errors/HTTPError";
import { AnyDredgeFetchClient, DredgeFetchClient } from "./types/client";
import {
  DefaultFetchOptions,
  FetchOptions,
  Hooks,
  NormalizedFetchOptions,
} from "./types/options";
import { mergeHeaders } from "./utils/headers";
import { trimSlashes } from "./utils/path";

export function dredgeFetchClient<const Routes>(): DredgeFetchClient<Routes> {
  const client = createDredgeFetchClient({}) as any;
  return client;
}

export function createDredgeFetchClient(
  defaultOptions: DefaultFetchOptions,
): AnyDredgeFetchClient {
  const client: any = (path: string, options: FetchOptions = {}) => {
    const _options = {
      ...options,
      ...mergeDefaultOptions(defaultOptions, options),
      path: getSimplePath(path, options?.params || {}),
      searchParams: options.searchParams || {},
      params: options.params || {},
    } as unknown as NormalizedFetchOptions;

    if (!_options.prefixUrl) {
      throw "No prefix URL provided";
    }

    for (const item of Object.keys(_options.dataTypes)) {
      if (item in _options) {
        _options.data = _options[item as keyof NormalizedFetchOptions];
        _options.dataType = item;

        delete _options[item as keyof NormalizedFetchOptions];
      }
    }

    let request: any = null;
    let response: any = null;

    async function fetchResponse() {
      const url = createURL(_options);

      const body = stringifyData(_options);

      request = new globalThis.Request(url, {
        ..._options,
        body,
      });

      if (body instanceof FormData) {
        _options.headers.delete("content-type");
      }

      for (const hook of _options.hooks.beforeRequest) {
        const result = await hook(
          _options as unknown as NormalizedFetchOptions,
          request,
        );

        if (result instanceof Request) {
          request = result;
          break;
        }

        if (result instanceof Response) {
          return result;
        }
      }

      const fetchResponse = await _options.fetch(request);
      return fetchResponse;
    }

    async function createDredgeResponse(response: globalThis.Response) {
      const dataType = extractDataType({ dataTypes: _options.dataTypes })(
        response.headers.get("content-type"),
      );

      (response as any).dataType = dataType;

      (response as any).data = async () => {
        let data = await parseBody(response);

        if (!dataType) return;
        const transformer = _options.dataTransformer?.[dataType]?.forResponse;

        if (!transformer) return;

        data = transformer(data);

        return data;
      };

      (response as any).clone = () => {
        const cloned = createDredgeResponse(response.clone());
        return cloned;
      };

      return response;
    }

    function decorateResponsePromise(responsePromise: any) {
      const dataTypes = _options.dataTypes;
      responsePromise.data = async () => {
        return (await responsePromise).data();
      };

      for (const [key] of Object.entries(dataTypes)) {
        responsePromise[key] = async () => {
          _options.responseDataType = key;

          return (await responsePromise).data();
        };
      }

      return responsePromise;
    }

    async function fn() {
      try {
        const contentTypeHeader = extractContentTypeHeader({
          dataTypes: _options.dataTypes,
          boundary: "--DredgeBoundary",
        })(_options.dataType);
        if (!_options.headers.get("content-type") && !!contentTypeHeader) {
          _options.headers.set("content-type", contentTypeHeader);
        }

        // Delay the fetch so that body method shortcuts can set the responseDataType
        await Promise.resolve();

        const acceptHeader = extractAcceptHeader({
          dataTypes: _options.dataTypes,
        })(_options.responseDataType);
        if (!_options.headers.get("accept") && !!acceptHeader) {
          _options.headers.set("accept", acceptHeader);
        }

        response = await fetchResponse();

        for (const hook of _options.hooks.afterResponse) {
          const modifiedResponse = await hook(
            _options as NormalizedFetchOptions,
            request,
            response,
          );

          if (modifiedResponse instanceof globalThis.Response) {
            response = modifiedResponse;
          }
        }

        if (!response.ok && _options.throwHttpErrors) {
          let error = new HTTPError(
            response,
            request,
            _options as unknown as NormalizedFetchOptions,
          );

          for (const hook of _options.hooks.beforeError) {
            error = await hook(error);
          }

          throw error;
        }

        return createDredgeResponse(response);
      } catch (err) {}
    }

    const responsePromise = fn();
    decorateResponsePromise(responsePromise);

    return responsePromise as any;
  };

  const alias = ["get", "post", "put", "patch", "delete", "head"] as const;

  alias.forEach((method) => {
    client[method] = (path: any, options?: FetchOptions) => {
      return client(path, {
        method: method,
        ...options,
      });
    };
  });

  client.extends = (extendOptions: DefaultFetchOptions) => {
    return createDredgeFetchClient(
      mergeDefaultOptions(defaultOptions, extendOptions),
    );
  };

  return client;
}

function objectToSearchParams(obj: any): URLSearchParams {
  const searchParams = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      for (const v of value) {
        searchParams.append(key, typeof v === "string" ? v : "");
      }
      return;
    }
    searchParams.append(key, typeof value === "string" ? value : "");
  });
  return searchParams;
}

function createURL(options: {
  prefixUrl: string;
  path: string;
  searchParams?: Record<string, string | string[]>;
}) {
  const { prefixUrl, path, searchParams = {} } = options;

  const url = new URL(prefixUrl);
  url.pathname = trimSlashes(url.pathname) + "/" + trimSlashes(path);
  url.search = objectToSearchParams(options.searchParams).toString();

  return url;
}

function mergeDefaultOptions(
  defaultOptions: DefaultFetchOptions,
  options: DefaultFetchOptions,
) {
  const dataTransformer = options.dataTransformer || {};

  for (const [key, value] of Object.entries(
    defaultOptions.dataTransformer || {},
  )) {
    if (!dataTransformer?.[key]) {
      dataTransformer[key] = value;
    }

    dataTransformer[key] = {
      ...value,
      ...dataTransformer[key],
    };
  }

  function mergeHooks<T>(
    target: T[] | undefined,
    source?: T[] | undefined,
  ): T[] {
    return [...(target || []), ...(source || [])];
  }

  const hooks: Hooks = {
    init: mergeHooks(defaultOptions?.hooks?.init, options?.hooks?.init),
    beforeRequest: mergeHooks(
      defaultOptions?.hooks?.beforeRequest,
      options.hooks?.beforeRequest,
    ),
    afterResponse: mergeHooks(
      defaultOptions?.hooks?.afterResponse,
      options?.hooks?.afterResponse,
    ),
    beforeError: mergeHooks(
      defaultOptions?.hooks?.beforeError,
      options?.hooks?.beforeError,
    ),
  };

  const newOptions: Pick<NormalizedFetchOptions, keyof DefaultFetchOptions> = {
    ctx: options.ctx ?? defaultOptions.ctx ?? {},
    headers: mergeHeaders(defaultOptions.headers, options.headers),
    prefixUrl: options.prefixUrl
      ? String(options.prefixUrl)
      : String(defaultOptions.prefixUrl),
    dataType: options.dataType ?? defaultOptions.dataType,
    responseDataType:
      options.responseDataType ?? defaultOptions.responseDataType,
    throwHttpErrors: options.throwHttpErrors ?? options.throwHttpErrors ?? true,
    dataTypes: {
      ...defaultOptions.dataTypes,
      ...options.dataTypes,
    },
    fetch:
      options.fetch ||
      defaultOptions.fetch ||
      globalThis.fetch.bind(globalThis),
    dataTransformer,
    hooks,
    referrer: options.referrer ?? defaultOptions.referrer,
  };

  return newOptions;
}

function getSimplePath(path: string, params: Record<string, any>) {
  const isParamPath = path.startsWith(":");

  if (!isParamPath) return path;

  let _path = trimSlashes(path.slice(1));

  const pathArray = _path.split("/");

  const simplePathArray = pathArray.map((item) => {
    if (item.startsWith(":")) {
      const param = params[item.slice(1)];

      if (!param) throw "Can't find specified param";

      return param;
    }
    return item;
  });

  return `/${simplePathArray.join("/")}`;
}

function extractContentTypeHeader(options: {
  dataTypes: Record<string, string>;
  boundary?: string;
}) {
  const { dataTypes, boundary } = options;
  return (dataType?: string) => {
    if (!dataType) return;
    if (!(dataType in dataTypes)) return;

    const mime = dataTypes[dataType]?.trim().toLowerCase();

    if (!mime) return;
    const mimeRegex = /[a-zA-Z\-]+\/[a-zA-z\-]+/g;
    if (!mimeRegex.test(mime)) return;

    const [mimeType] = mime.split("/");

    if (mimeType?.includes("multipart")) {
      return boundary ? `${mime};boundary=${boundary}` : undefined;
    }

    return mime;
  };
}

function extractAcceptHeader(options: {
  dataTypes: Record<string, string>;
}) {
  const { dataTypes } = options;
  return (dataType?: string) => {
    if (!dataType) return;
    if (!(dataType in dataTypes)) return;

    const mime = dataTypes[dataType]?.trim().toLowerCase();

    if (!mime) return;
    const mimeRegex = /[a-zA-Z\-]+\/[a-zA-z\-]+/g;
    if (!mimeRegex.test(mime)) return;

    return mime;
  };
}

function extractDataType(options: { dataTypes: Record<string, string> }) {
  return (acceptOrContentTypeHeader?: string | null) => {
    if (!acceptOrContentTypeHeader) return;

    const mime = acceptOrContentTypeHeader.trim().split(";")[0];
    if (!mime) return;
    // const mimeRegex = /[a-zA-Z\-]+\/[a-zA-z\-]+/g;
    // if(mimeRegex.test(mime)) return;

    for (const [key, value] of Object.entries(options.dataTypes)) {
      if (value == mime) {
        return key;
      }
    }
  };
}

function stringifyData(options: NormalizedFetchOptions) {
  const { headers, data: _data, dataTransformer, dataType } = options;

  let data = _data;
  if (dataType) {
    const transformer = dataTransformer?.[dataType]?.forResponse;
    data = transformer ? transformer(data) : data;
  }

  const contentType = headers.get("content-type");

  if (!contentType) return;

  if (contentType.startsWith("application/json")) {
    return JSON.stringify(data);
  }

  if (contentType.startsWith("multipart/form-data")) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (
        typeof value === "string" ||
        value instanceof Blob ||
        value instanceof File
      ) {
        formData.append(key, value);
      } else {
        throw "serialization failed";
      }
    });

    return formData;
  }

  if (contentType.startsWith("application/x-www-form-urlencoded")) {
    const urlSearchParam = new URLSearchParams(data);

    return urlSearchParam;
  }

  return;
}

async function parseBody(response: globalThis.Response) {
  const contentType = response.headers.get("content-type");

  if (!contentType) return response.body;

  if (contentType.startsWith("application/json")) {
    return await response.json();
  }

  if (contentType.startsWith("multipart/form-data")) {
    const formData = await response.formData();

    return Object.fromEntries(formData.entries());
  }

  if (contentType.startsWith("application/x-www-form-urlencoded")) {
    const formData = await response.formData();

    return Object.fromEntries(formData.entries());
  }

  if (contentType.startsWith("text")) {
    return await response.text();
  }

  return null;
}
