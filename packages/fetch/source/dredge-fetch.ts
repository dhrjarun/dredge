import {
  MimeStore,
  getSimplePath,
  mergeHeaders,
  normalizeSearchParamObject,
  trimSlashes,
} from "@dredge/common";
import { HTTPError } from "./errors/HTTPError";
import { AnyDredgeFetchClient, DredgeFetchClient } from "./types/client";
import {
  DefaultFetchOptions,
  FetchOptions,
  Hooks,
  NormalizedFetchOptions,
} from "./types/options";

export function dredgeFetch<const Routes>(): DredgeFetchClient<Routes> {
  const client = createDredgeFetch() as any;
  return client;
}

export function createDredgeFetch(
  defaultOptions: DefaultFetchOptions = {},
): AnyDredgeFetchClient {
  const client: any = (path: string, options: FetchOptions = {}) => {
    const serializeParams = options.serializeParams || ((p) => p);
    const serializeSearchParams = options.serializeSearchParams || ((p) => p);

    const serializedParams = serializeParams(options?.params || {});
    const serializedSearchParams = serializeSearchParams(
      options?.searchParams || {},
    );
    const _options = {
      ...options,
      ...mergeDefaultOptions(defaultOptions, options),
      path: getSimplePath(path, serializedParams),
      params: options.params || {},
      searchParams: normalizeSearchParamObject(options.searchParams || {}),
      serializeParams,
      serializeSearchParams,
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
      const url = createURL({
        prefixUrl: _options.prefixUrl,
        path: _options.path,
        searchParams: serializedSearchParams,
      });

      let body: any = null;

      const dataSerializerInfo = {
        data: _options.data,
        mediaType: undefined as string | undefined,
        charset: undefined as string | undefined,
        boundary: undefined as string | undefined,
      };
      if (_options.headers.get("content-type")) {
        const info = extractContentTypeHeader(
          _options.headers.get("content-type"),
        );
        dataSerializerInfo.mediaType = info.mediaType;
        dataSerializerInfo.charset = info.charset;
        dataSerializerInfo.boundary = info.boundary;
      } else if (_options.dataType) {
        dataSerializerInfo.mediaType = _options.dataTypes[_options.dataType];
      }
      if (dataSerializerInfo.mediaType) {
        const dataSerializer = _options.dataSerializers.get(
          dataSerializerInfo.mediaType,
        );

        if (dataSerializer) {
          body = await dataSerializer(dataSerializerInfo as any);
        }

        let contentTypeHeader = dataSerializerInfo.mediaType;
        if (dataSerializerInfo.boundary) {
          contentTypeHeader += `;boundary=${dataSerializerInfo.boundary}`;
        }
        if (dataSerializerInfo.charset) {
          contentTypeHeader += `;charset=${dataSerializerInfo.charset}`;
        }

        _options.headers.set("content-type", contentTypeHeader);
      }
      // body = stringifyData(_options);

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
      const dataType = getDataType({ dataTypes: _options.dataTypes })(
        response.headers.get("content-type"),
      );

      (response as any).dataType = dataType;

      (response as any).data = async () => {
        const bodyParserInfo = extractContentTypeHeader(
          response.headers.get("content-type"),
        );
        const bodyParser = bodyParserInfo?.mediaType
          ? _options.bodyParsers.get(bodyParserInfo.mediaType)
          : undefined;
        let data: any = undefined;
        if (bodyParser) {
          data = await bodyParser({
            mediaType: bodyParserInfo.mediaType,
            boundary: bodyParserInfo.boundary,
            charset: bodyParserInfo.charset,

            body: response.body,
            text: response.text.bind(response),
            arrayBuffer: response.arrayBuffer.bind(response),
            blob: response.blob.bind(response),
            formData: response.formData.bind(response),
          } as any);
        }
        // let data = await parseBody(response);

        if (!dataType) return data;
        const transformer = _options.dataTransformer?.[dataType]?.forResponse;

        if (!transformer) return data;

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
        const contentTypeHeader = getContentTypeHeader({
          dataTypes: _options.dataTypes,
          boundary: "--DredgeBoundary",
        })(_options.dataType);
        if (!_options.headers.get("content-type") && !!contentTypeHeader) {
          _options.headers.set("content-type", contentTypeHeader);
        }

        // Delay the fetch so that body method shortcuts can set the responseDataType
        await Promise.resolve();

        const acceptHeader = getAcceptHeader({
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
      } catch (err) {
        throw err;
      }
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
    return createDredgeFetch(
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
  url.search = objectToSearchParams(searchParams).toString();

  return url;
}

function mergeDefaultOptions(
  defaultOptions: DefaultFetchOptions,
  options: DefaultFetchOptions,
) {
  const dataTransformer = options.dataTransformer || {};

  for (const [key, value] of Object.entries(
    defaultOptions?.dataTransformer || {},
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
      ? String(options.prefixUrl || "")
      : String(defaultOptions.prefixUrl || ""),
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
    dataSerializers: new MimeStore([
      defaultOptions.dataSerializers || {},
      options.dataSerializers || {},
    ]),
    bodyParsers: new MimeStore([
      defaultOptions.bodyParsers || {},
      options.bodyParsers || {},
    ]),
  };

  return newOptions;
}

function getContentTypeHeader(options: {
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

function extractContentTypeHeader(contentType?: string | null) {
  const data: Record<string, string | undefined> = {
    charset: undefined,
    boundary: undefined,
    mediaType: undefined,
  };
  if (!contentType) return data;

  const splitted = contentType.trim().split(";");

  data.mediaType = splitted[0];

  for (const item of splitted.slice(1)) {
    const [key, value] = item.trim().split("=");
    if (key) {
      data[key] = value;
    }
  }

  return data;
}

function getAcceptHeader(options: {
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

function getDataType(options: { dataTypes: Record<string, string> }) {
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
