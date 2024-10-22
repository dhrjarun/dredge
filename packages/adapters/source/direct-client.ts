import {
  getAcceptHeader,
  getContentTypeHeader,
  getSimplePath,
  mergeDredgeHeaders,
  normalizeSearchParamObject,
  trimSlashes,
} from "dredge-common";
import {
  MiddlewareRequest,
  useErrorMiddlewares,
  useSuccessMiddlewares,
  useValidate,
} from "dredge-route";
import { DredgeClientOptions, DredgeRouter } from "dredge-types";
import { HTTPError } from "./HTTPError";
import {
  AnyDirectClient,
  DefaultDirectClientOptions,
  DirectClient,
  DirectClientOptions,
  DirectClientResponse,
  NormalizedDirectClientOptions,
} from "./types/dredge-direct-client";

export function directClient<Router extends DredgeRouter>(
  router: Router,
): DirectClient<Router> {
  const client = createDirectClient(router, {}) as any;

  return client;
}

export function createDirectClient(
  router: DredgeRouter,
  defaultOptions: DefaultDirectClientOptions = {},
): AnyDirectClient {
  const client: any = (path: string, options: DirectClientOptions = {}) => {
    const _options = {
      ...options,
      ...mergeDefaultOptions(defaultOptions, options),
      path: getSimplePath(path, options?.params || {}),
      params: options?.params || {},
      queries: normalizeSearchParamObject(options?.queries || {}),
    } as NormalizedDirectClientOptions;

    for (const item of Object.keys(_options.dataTypes)) {
      if (item in _options) {
        _options.data = _options[item as keyof DredgeClientOptions];
        _options.dataType = item;

        delete _options[item as keyof DredgeClientOptions];
      }
    }

    const pathArray = trimSlashes(_options.path).split("/");
    const route = router.find(_options.method, pathArray)!;
    if (!route) {
      throw "not-found";
    }

    async function fn() {
      const contentTypeHeader = getContentTypeHeader(_options.dataTypes)(
        _options.dataType,
      );
      if (!_options.headers["content-type"] && !!contentTypeHeader) {
        _options.headers["content-type"] = contentTypeHeader;
      }

      // Delay the fetch so that body method shortcut can set the responseDataType
      await Promise.resolve();

      const acceptHeader = getAcceptHeader(_options.dataTypes)(
        _options.responseDataType,
      );
      if (!_options.headers["accept"] && !!acceptHeader) {
        _options.headers["accept"] = acceptHeader;
      }

      const url = _options.prefixUrl
        ? new URL(_options.path, _options.prefixUrl).href
        : _options.path;

      const middlewareRequest: MiddlewareRequest = {
        url,
        method: _options.method,
        headers: _options.headers,
        params: _options.params,
        queries: _options.queries,
        data: _options.data,
        dataType: _options.dataType,
      };

      let result: any = null;
      try {
        const validatedRequest = await useValidate(route)(middlewareRequest);
        const middlewareResponse = await useSuccessMiddlewares(route)(
          validatedRequest,
          {
            headers: {},
            // dataType: getDataType(route._def.dataTypes)(
            //   validatedRequest.headers["accept"],
            // ),
            ctx: _options.serverCtx,
          },
        );

        result = middlewareResponse;
      } catch (error) {
        const middlewareResponse = await useErrorMiddlewares(route)(
          error,
          middlewareRequest,
          {
            headers: {},
            // dataType: getDataType(route._def.dataTypes)(
            //   middlewareRequest.headers["accept"],
            // ),
            ctx: _options.serverCtx,
          },
        );

        result = middlewareResponse;
      }

      const data = result.data;
      const response: DirectClientResponse = {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        data: () => {
          return Promise.resolve(data);
        },
        ok: false,
      };

      const { status = 200 } = response;
      // https://developer.mozilla.org/en-US/docs/Web/API/Response/ok
      if (status >= 200 && status <= 299) {
        response.ok = true;
      } else {
        response.ok = false;
      }
      if (response.ok === false) {
        throw new HTTPError(response, _options);
      }

      return response;
    }

    const responsePromise = fn();
    function decorateResponsePromise(responsePromise: any) {
      const dataTypes = _options.dataTypes;
      responsePromise.data = async () => {
        return (await responsePromise).data();
      };

      for (const key of Object.keys(dataTypes)) {
        responsePromise[key] = async () => {
          _options.responseDataType = key;

          return (await responsePromise).data();
        };
      }
    }

    decorateResponsePromise(responsePromise);
    return responsePromise;
  };

  const alias = ["get", "post", "put", "patch", "delete", "head"] as const;

  alias.forEach((method) => {
    client[method] = (path: any, options?: DirectClientOptions) => {
      return client(path, {
        method: method,
        ...options,
      });
    };
  });

  client.extends = (extendOptions: DefaultDirectClientOptions) => {
    return createDirectClient(
      router,
      mergeDefaultOptions(defaultOptions, extendOptions),
    );
  };

  return client;
}

function mergeDefaultOptions(
  defaultOptions: DefaultDirectClientOptions,
  options: DefaultDirectClientOptions,
) {
  const newOptions: Pick<
    NormalizedDirectClientOptions,
    keyof DefaultDirectClientOptions
  > = {
    serverCtx: options.serverCtx ?? defaultOptions.serverCtx ?? {},
    headers: mergeDredgeHeaders(
      defaultOptions?.headers ?? {},
      options?.headers ?? {},
    ),
    dataType: options.dataType ?? defaultOptions.dataType,
    responseDataType:
      options.responseDataType ?? defaultOptions.responseDataType,
    throwHttpErrors: options.throwHttpErrors ?? options.throwHttpErrors ?? true,
    dataTypes: {
      ...defaultOptions.dataTypes,
      ...options.dataTypes,
    },
  };

  if (defaultOptions.prefixUrl || options.prefixUrl) {
    newOptions.prefixUrl = options.prefixUrl
      ? String(options.prefixUrl)
      : String(defaultOptions.prefixUrl);
  }

  return newOptions;
}
