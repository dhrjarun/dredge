import { mergeDeep, trimSlashes } from "@dredge/common";
import { HTTPError } from "./errors/HTTPError";
import { FetchOptions, NormalizedFetchOptions } from "./types/options";
import { DredgeResponse, DredgeResponsePromise } from "./types/response";

export const mergeHeaders = (
  source1: HeadersInit = {},
  source2: HeadersInit = {},
) => {
  const result = new globalThis.Headers(source1 as RequestInit["headers"]);
  const isHeadersInstance = source2 instanceof globalThis.Headers;
  const source = new globalThis.Headers(source2 as RequestInit["headers"]);

  for (const [key, value] of source.entries()) {
    if ((isHeadersInstance && value === "undefined") || value === undefined) {
      result.delete(key);
    } else {
      result.set(key, value);
    }
  }

  return result;
};

export function dredgeFetch(
  path: string,
  options: Omit<FetchOptions, "path"> & Record<string, any>,
): DredgeResponsePromise<any> {
  if (!options.prefixUrl) {
    throw "No prefix URL provided";
  }

  if (!options.stringify) {
    throw "stringify is not provided";
  }

  if (!options.parse) {
    throw "parser function has not been provided";
  }

  const _options = {
    ...options,
    throwHttpError: !!options.throwHttpErrors,
    path,
    ctx: options.ctx || {},
    prefixUrl:
      options.prefixUrl instanceof URL
        ? options.prefixUrl
        : new URL(options.prefixUrl),
    headers: new Headers(options.headers),
    hooks: mergeDeep(
      {
        afterResponse: [],
      },
      options.hooks || {},
    ),
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    dataTypes: options?.dataTypes || [],
  } as unknown as NormalizedFetchOptions;

  for (const item of _options.dataTypes) {
    if (item in _options) {
      _options.data = options[item];
      _options.dataType = item;

      delete _options[item];
    }
  }

  let url = createURL(_options).toString();
  let request: any = null;
  let response: any = null;

  async function fetchResponse() {
    const url = createURL(_options);
    request = new globalThis.Request(url, {
      ..._options,
      body: _options.stringify(_options.data, {
        url: url.toString(),
        ctx: _options.ctx,
        method: _options.method,
        headers: _options.headers,
        dataType: _options.dataType,
      }),
    });

    for (const hook of _options.hooks.beforeRequest) {
      // eslint-disable-next-line no-await-in-loop
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
    (response as any).data = () => {
      return _options.parse(response.body, {
        ctx: _options.ctx,
        url,
        headers: response.headers,
        status: response.status,
        statusText: response.statusText,
        dataType: _options.responseDataType,
      });
    };

    return response;
  }

  function decorateResponsePromise(responsePromise: any) {
    for (const dt of _options.dataTypes) {
      response[dt] = async () => {
        _options.dataType = dt;
        return (await responsePromise).data();
      };
    }

    return responsePromise;
  }

  async function fn() {
    try {
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

  return responsePromise;
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
  prefixUrl: URL;
  path: string;
  searchParams?: Record<string, string | string[]>;
}) {
  const { prefixUrl, path, searchParams = {} } = options;

  const url = new URL(prefixUrl);
  url.pathname = trimSlashes(prefixUrl.pathname) + "/" + trimSlashes(path);
  url.search = objectToSearchParams(options.searchParams).toString();

  return url;
}

// TODO:
// fix response return type and change DredgeResponse and DredgeResponsePromise
// see if decorateResponsePromise is working or not
// searchParams type
// make it work with types
