import {
  MimeStore,
  defaultJSONBodyParser,
  defaultJsonDataSerializer,
  serializeParams as defaultSerializeParams,
  serializeQueries as defaultSerializeQueries,
  defaultTextBodyParser,
  defaultTextDataSerializer,
  getSimplePath,
  mergeHeaders,
  normalizeSearchParamObject,
  trimSlashes,
} from "dredge-common";
import { HTTPError } from "./errors/HTTPError";
import { AnyDredgeFetchClient, DredgeFetchClient } from "./types/client";
import {
  DefaultFetchOptions,
  FetchOptions,
  Hooks,
  NormalizedFetchOptions,
} from "./types/options";

export function dredgeFetch<const Routes>(): DredgeFetchClient<Routes> {
  const client = untypedDredgeFetch() as any;
  return client;
}

export function untypedDredgeFetch(
  defaultOptions: DefaultFetchOptions = {},
): AnyDredgeFetchClient {
  defaultOptions.bodyParsers = new MimeStore([
    {
      "application/json": defaultJSONBodyParser,
      "text/plain": defaultTextBodyParser,
    },
    defaultOptions.bodyParsers || {},
  ]);

  defaultOptions.dataSerializers = new MimeStore([
    {
      "application/json": defaultJsonDataSerializer,
      "text/plain": defaultTextDataSerializer,
    },
    defaultOptions.dataSerializers || {},
  ]);

  const client: any = (path: string, options: FetchOptions = {}) => {
    const extendedOptions = mergeDefaultOptions(defaultOptions, options);

    const normalizedQueries = normalizeSearchParamObject(
      options?.queries || {},
    );
    const serializedParams = extendedOptions.serializeParams(
      options?.params || {},
    );
    const serializedQueries =
      extendedOptions.serializeQueries(normalizedQueries);

    const _options = {
      ...options,
      ...extendedOptions,
      path: getSimplePath(path, serializedParams),
      params: options?.params || {},
      queries: normalizedQueries,
    } as unknown as NormalizedFetchOptions;

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
        queries: serializedQueries,
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
    return untypedDredgeFetch(
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
  queries?: Record<string, string | string[]>;
}) {
  let { prefixUrl, path, queries = {} } = options;

  path = trimSlashes(path);

  if (!prefixUrl.endsWith("/")) {
    prefixUrl += "/";
  }

  let search = objectToSearchParams(queries).toString();
  let url = prefixUrl + path;
  if (search) {
    url += "?" + search;
  }

  return url;
}

function mergeDefaultOptions(
  defaultOptions: DefaultFetchOptions,
  options: DefaultFetchOptions,
) {
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
    serializeParams:
      options.serializeParams ||
      defaultOptions.serializeParams ||
      defaultSerializeParams,
    serializeQueries:
      options.serializeQueries ||
      defaultOptions.serializeQueries ||
      defaultSerializeQueries,
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
