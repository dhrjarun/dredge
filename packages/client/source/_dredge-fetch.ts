import {
  DredgeHeaders,
  DredgeResponse,
  DredgeResponsePromise,
  DredgeSearchParams,
  HTTPMethod,
  MaybePromise,
  mergeDeep,
  mergeHeaders,
  trimSlashes,
} from "@dredge/common";

type FetchOptions = {
  fetch?: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>;
  transformIn?: TransformInMiddlewareFunction[];
  transformOut?: TransformOutMiddlewareFunction[];
  dataShortcuts?: string[];
  prefixUrl?: URL | string;
  ctx?: Context;
} & DredgeRequestInit;

type DredgeRequestInit = {
  method: HTTPMethod | string;
  path: string;
  searchParams?: DredgeSearchParams;
  headers?: DredgeHeaders;
  data?: any;
} & Omit<RequestInit, "body" | "headers" | "method">;

type Context = Record<string, unknown>;

type TransformInMiddlewareResult = RequestInit & {
  url: URL;
  ctx: Context;
};

type TransformInMiddlewareFunction = {
  (
    req: DredgeRequestInit & {
      dataShortcutUsed: "auto" | string;
      next: {
        (): TransformInMiddlewareResult;
        (
          opts: RequestInit & {
            url?: string | URL;
            ctx?: Context;
          },
        ): TransformInMiddlewareResult;
      };
      $transformed: Request;
    },
  ): MaybePromise<TransformInMiddlewareResult>;
};

type TransformOutMiddlewareResult = {
  status?: number;
  statusText?: string;
  headers: DredgeHeaders;
  data: unknown;
  ctx: Context;
};

type TransformOutMiddlewareFunction = {
  (
    req: Request,
    res: Response & {
      ctx: Context;
      next: {
        (): TransformOutMiddlewareResult;
        (opts: {
          ctx?: Context;
          status?: number;
          statusText?: string;
          headers?: DredgeHeaders;
          data?: any | (() => any);
        }): TransformOutMiddlewareResult;
      };
      $transformed: {
        status?: number;
        statusText?: string;
        headers: DredgeHeaders;
        data?: any | (() => any);
      };
    },
  ): MaybePromise<TransformOutMiddlewareResult>;
};

export function dredgeFetch(
  path: string,
  options: Omit<FetchOptions, "path">,
): DredgeResponsePromise<any> {
  const {
    fetch: _fetch,
    transformIn = [],
    transformOut = [],
    dataShortcuts: _dataShortcuts = [],
    ctx = {},
    prefixUrl: _prefixUrl,
    ...requestInit
  } = options;

  async function transformRequest(ctx: Context, request: DredgeRequestInit) {
    let requestInit = request as any;
    const dataShortcuts = ["data", ..._dataShortcuts];
    let data: any = null;
    let dataShortcutUsed: string = "auto";

    for (const item of dataShortcuts) {
      if (typeof requestInit[item] !== "undefined") {
        data = requestInit[item];
        dataShortcutUsed = item === "data" ? "auto" : dataShortcutUsed;
        delete requestInit[item];
        break;
      }
    }

    const { headers, searchParams, ...restOfRequestInit } = requestInit;
    if (!_prefixUrl) {
      throw "No prefix URL provided";
    }
    const prefixUrl =
      _prefixUrl instanceof URL ? _prefixUrl : new URL(_prefixUrl);
    const url = new URL(prefixUrl);
    url.pathname = trimSlashes(prefixUrl.pathname) + "/" + trimSlashes(path);
    url.search = objectToSearchParams(searchParams).toString();

    let transformedRequest = {
      url: url,
      headers,
      ...restOfRequestInit,
    };

    let currentCtx = {
      ...ctx,
    };

    for (const middleware of transformIn) {
      const result = await middleware({
        ...requestInit,
        data,
        dataShortcutUsed,
        next: (options?: any) => {
          currentCtx = mergeDeep(currentCtx, options.ctx);

          return {
            ...restOfRequestInit,
            ...options,
            url:
              typeof options.url === "string"
                ? new URL(options.url)
                : options.url || url,
            ctx: currentCtx,
            headers: mergeHeaders(headers, options?.headers || {}),
          };
        },
        $transformed: transformedRequest,
      });

      const { ctx, ...newRequest } = result;
      currentCtx = ctx;
      transformedRequest = newRequest;
    }

    return transformedRequest;
  }

  async function transformResponse(
    ctx: Context,
    request: Request,
    response: Response,
  ) {
    let transformedResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: null,
    };

    let currentCtx = {
      ...ctx,
    };

    for (const middleware of transformOut) {
      const result = await middleware(request, {
        ...response,
        ctx: currentCtx,
        next: (options?: any) => {
          return {
            ctx: mergeDeep(currentCtx, options?.ctx || {}),
            headers: mergeHeaders(
              transformedResponse.headers,
              options?.headers || {},
            ),
            status: options?.status || transformedResponse.status,
            statusText: options?.statusText || transformedResponse.statusText,
            data: options.data || null,
          };
        },
        $transformed: transformResponse,
      });

      const { ctx, ...newResponse } = result;

      currentCtx = ctx;
      transformedResponse = newResponse;
    }
  }

  async function fn() {
    try {
      const transformedRequest = transformRequest(ctx, requestInit);
      const request = new globalThis.Request(
        transformedRequest.url,
        transformedRequest,
      );
      const fetch = _fetch ?? globalThis.fetch.bind(globalThis);

      const response: any = await fetch(request);
    } catch (err) {}
  }

  // async function _function() {
  //   const response: any = await fetch(request);

  //   response.data = async () => {
  //     const contentType = response.headers.get("Content-Type");
  //     let data: any;

  //     if (contentType?.startsWith("application/json")) {
  //       data = transformer.json.deserialize(await response.text());
  //     }
  //     if (contentType?.startsWith("multipart/form-data")) {
  //       data = transformer.formData.deserialize(await response.formData());
  //     }

  //     if (contentType?.startsWith("application/x-www-form-urlencoded")) {
  //       const searchParams = new URLSearchParams(await response.text());
  //       data = transformer.searchParams.deserialize(searchParams);
  //     }

  //     if (response.ok) {
  //       return Promise.resolve(data);
  //     } else {
  //       return Promise.reject(data);
  //     }
  //   };

  //   response.json = async () => {
  //     return transformer.json.deserialize(await response.text());
  //   };

  //   return response as DredgeResponse<any>;
  // }

  // const responsePromise = _function() as DredgeResponsePromise;
  // decorateResponsePromise(responsePromise);

  // return responsePromise;
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
