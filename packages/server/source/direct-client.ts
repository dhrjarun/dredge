import { AnyRoute } from "@dredge/route";
import { IsNever } from "ts-essentials";
import { HTTPError } from "./HTTPError";
import { dredgeRouter } from "./router";
import {
  DredgeClientOptions,
  inferRouteArrayContext,
} from "./types/dredge-client-option";
import {
  AnyDirectClient,
  DefaultDirectClientOptions,
  DirectClient,
  DirectClientOptions,
  DirectClientResponse,
  NormalizedDirectClientOptions,
} from "./types/dredge-direct-client";
import { mergeHeaders } from "./utils/headers";
import { trimSlashes } from "./utils/path";

export function directClient<const Routes extends AnyRoute[]>(
  routes: Routes,
): IsNever<inferRouteArrayContext<Routes>> extends false
  ? DirectClient<Routes>
  : "Routes's Context do not match" {
  const client = createDirectClient(routes, {}) as any;

  return client;
}

export function createDirectClient(
  routes: AnyRoute[],
  defaultOptions: DefaultDirectClientOptions = {},
): AnyDirectClient {
  const router = dredgeRouter(routes);

  const client: any = (path: string, options: DirectClientOptions = {}) => {
    const _options = {
      ...options,
      ...mergeDefaultOptions(defaultOptions, options),
      path: getSimplePath(path, options?.params || {}),
    } as NormalizedDirectClientOptions;

    for (const item of Object.keys(_options.dataTypes)) {
      if (item in _options) {
        _options.data = _options[item as keyof DredgeClientOptions];
        _options.dataType = item;

        delete _options[item as keyof DredgeClientOptions];
      }
    }

    async function fn() {
      const contentTypeHeader = extractContentTypeHeader({
        dataTypes: _options.dataTypes,
        boundary: "--DredgeBoundary",
      })(_options.dataType);
      if (!_options.headers["content-type"] && !!contentTypeHeader) {
        _options.headers["content-type"] = contentTypeHeader;
      }

      // Delay the fetch so that body method shortcut can set the responseDataType
      await Promise.resolve();

      const acceptHeader = extractAcceptHeader({
        dataTypes: _options.dataTypes,
      })(_options.responseDataType);
      if (!_options.headers["accept"] && !!acceptHeader) {
        _options.headers["accept"] = acceptHeader;
      }

      const result = (await router.call(_options.path, {
        ctx: _options.serverCtx,
        data: _options.data,
        method: _options.method,
        headers: _options.headers,
        searchParams: _options.searchParams,
        prefixUrl: _options.prefixUrl,
        transformData: false,
      })) as DirectClientResponse;

      const data = result.data;
      result.data = () => {
        return Promise.resolve(data);
      };

      const { status = 200 } = result;
      // https://developer.mozilla.org/en-US/docs/Web/API/Response/ok
      if (status >= 200 && status <= 299) {
        result.ok = true;
      } else {
        result.ok = false;
      }
      if (result.ok === false) {
        throw new HTTPError(result, _options);
      }

      return result;
    }

    const responsePromise = fn();
    function decorateResponsePromise(responsePromise: any) {
      const dataTypes = _options.dataTypes;
      responsePromise.data = async () => {
        return (await responsePromise).data();
      };

      for (const [key, value] of Object.entries(dataTypes)) {
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
      routes,
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
    headers: mergeHeaders(
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
