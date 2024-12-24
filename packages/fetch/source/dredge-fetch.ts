import {
  MimeStore,
  defaultJSONBodyParser,
  defaultJsonDataSerializer,
  serializeParams as defaultSerializeParams,
  defaultTextBodyParser,
  defaultTextDataSerializer,
  mergeHeaders,
  parseContentType,
  DataTypes,
  createURL,
  objectToDredgeParams,
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

    const params = objectToDredgeParams(path, options?.params || {});
    const serializedParams = extendedOptions.serializeParams(params);

    const _options = {
      ...options,
      ...extendedOptions,
      path,
      params: options?.params || {},
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
    const dataTypes = new DataTypes(_options.dataTypes);

    async function fetchResponse() {
      const url = createURL({
        prefixUrl: _options.prefixUrl,
        path: _options.path,
        params: serializedParams,
      });

      let body: any = null;
      const dataSerializeOptions = {
        data: _options.data,
        contentType:
          _options.headers.get("content-type") ||
          dataTypes.getContentTypeHeader(_options.dataType || ""),
      };

      const ct = parseContentType(dataSerializeOptions.contentType);
      if (ct?.type) {
        const dataSerializer = _options.dataSerializers.get(ct.type);

        if (dataSerializer) {
          body = await dataSerializer(dataSerializeOptions as any);
        }

        _options.headers.set(
          "content-type",
          dataSerializeOptions.contentType || "",
        );
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
      const dataType = dataTypes.getDataTypeFromContentType(
        response.headers.get("content-type") || "",
      );

      (response as any).dataType = dataType;

      (response as any).data = async () => {
        const ct = parseContentType(response.headers.get("content-type"));
        const bodyParser = _options.bodyParsers.get(ct?.type || "");
        let data: any = undefined;

        if (bodyParser) {
          data = await bodyParser({
            contentType: response.headers.get("content-type"),
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
        const contentTypeHeader = dataTypes.getContentTypeHeader(
          _options.dataType || "",
        );
        if (!_options.headers.get("content-type") && !!contentTypeHeader) {
          _options.headers.set("content-type", contentTypeHeader);
        }

        // Delay the fetch so that body method shortcuts can set the responseDataType
        await Promise.resolve();

        const acceptHeader = dataTypes.getAcceptHeader(
          _options.responseDataType || "",
        );
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
  };

  return newOptions;
}
