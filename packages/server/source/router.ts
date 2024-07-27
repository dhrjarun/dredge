import {
  AnyRoute,
  BodyFn,
  BodyTypes,
  MiddlewareResult,
  Parser,
  getParseFn,
} from "@dredge/route";
import { mergeHeaders, normalizeHeaders } from "./utils/headers";
import { isPathnameValid, isValidPrefixUrl, trimSlashes } from "./utils/path";

export class RoutePath {
  name: string;
  isParam: boolean;

  routes = new Map<string, AnyRoute>();

  children = new Map<string, RoutePath>();
  dynamicChild: RoutePath | null = null;

  constructor(options: {
    name: string;
    isParam?: boolean;
    routes?: AnyRoute[];
  }) {
    const { name, isParam = false, routes = [] } = options;
    this.name = name;
    this.isParam = isParam;

    routes.forEach((item) => {
      this.routes.set(item._def.method || "get", item);
    });
  }

  hasStaticChild(name: string) {
    return this.children.has(name);
  }

  getRoute(method: string) {
    return this.routes.get(method.toLowerCase());
  }
  setRoute(route: AnyRoute) {
    this.routes.set(route._def.method || "get", route);
  }

  hasChild(name: string) {
    if (name.startsWith(":")) {
      return this.hasDynamicChild();
    }

    return this.hasStaticChild(name);
  }

  hasDynamicChild() {
    return !!this.dynamicChild;
  }

  addChild(name: string, routes?: AnyRoute[]) {
    if (name.startsWith(":")) {
      this.dynamicChild = new RoutePath({
        name: name.replace(":", ""),
        isParam: true,
        routes,
      });
      return;
    }

    this.children.set(
      name,
      new RoutePath({
        name,
        routes,
      }),
    );
  }

  getStaticChild(name: string) {
    return this.children.get(name);
  }
  getDynamicChild() {
    return this.dynamicChild;
  }

  getChild(name: string) {
    if (name.startsWith(":")) {
      return this.getDynamicChild();
    }

    return this.getStaticChild(name);
  }
}

export interface DredgeRouter {
  _def: {
    root: RoutePath;
  };

  call(
    path: string,
    options: {
      headers?: Record<string, string>;
      method?: string;
      data?: any;
      body?: BodyFn;
      searchParams?: Record<string, any>;
      ctx?: any;
      prefixUrl?: string;
      transformData?: boolean | "onlyRequest" | "onlyResponse";
    },
  ): Promise<{
    headers: Record<string, string>;
    status?: number;
    statusText?: string;
    dataType?: string;
    data: any;
    body?: BodyTypes;
  }>;
}

export function dredgeRouter<const Routes extends AnyRoute[]>(
  routes: Routes,
): DredgeRouter {
  const root = new RoutePath({
    name: "$root",
  });

  routes.forEach((route) => {
    const def = route._def;
    const paths = def.paths as string[];

    let current = root;
    paths.forEach((name) => {
      if (!current.hasChild(name)) {
        current.addChild(name);
      }
      current = current.getChild(name)!;
    });

    current.setRoute(route);
  });

  return {
    _def: {
      root,
    },

    call: async (path, options) => {
      const {
        method = "get",
        headers = {},
        data,
        searchParams = {},
        ctx: _ctx = {},
        prefixUrl,
        transformData = true,
        body,
      } = options;

      let current = root;
      const _path = trimSlashes(path);
      if (!isPathnameValid(_path)) {
        throw TypeError("Invalid Pathname");
      }
      const pathArray = _path.split("/");
      const urlSearchParams = new URLSearchParams(searchParams);

      if (prefixUrl && !isValidPrefixUrl(prefixUrl)) {
        throw TypeError("Invalid Prefix Url");
      }

      let url = (prefixUrl ? trimSlashes(prefixUrl) : "") + "/" + _path;
      const search = urlSearchParams.toString();
      if (search) {
        url += "?" + search;
      }

      pathArray.forEach((item) => {
        const child = current.getStaticChild(item) || current.getDynamicChild();

        if (!child) {
          throw "not-found";
        }

        current = child;
      });

      const routeDef = current.getRoute(method)?._def!;
      if (!routeDef) {
        throw "not-found";
      }

      const ctx = {
        ...routeDef.defaultContext,
        ..._ctx,
      };

      const params: Record<string, string> = routeDef.paths.reduce(
        (acc: any, item: string, index: number) => {
          if (item.startsWith(":")) {
            acc[item.replace(":", "")] = pathArray[index];
          }
          return acc;
        },
        {},
      );

      const _headers = normalizeHeaders(headers);
      const dataType = extractDataType({ dataTypes: routeDef.dataTypes })(
        _headers["content-type"],
      );
      const unValidatedRequest = {
        url,
        method,
        headers: _headers,
        params,
        searchParams,
        data,
        dataType,
      };

      const contentTypeInfo = extractContentTypeHeader(headers["content-type"]);
      const bodyParser = contentTypeInfo?.mediaType
        ? routeDef.bodyParsers.get(contentTypeInfo.mediaType)
        : undefined;
      if (bodyParser) {
        if (typeof body === "function") {
          const data = await bodyParser({
            body,
            mediaType: contentTypeInfo.mediaType,
            boundary: contentTypeInfo.boundary,
            charset: contentTypeInfo.charset,
          });

          unValidatedRequest.data = data;
        }
      }

      function transformRequestDataIfNeeded() {
        const shouldTransform =
          transformData === true || transformData == "onlyRequest";
        if (!shouldTransform) return;

        const dataType = unValidatedRequest.dataType;

        if (!dataType) return;

        const transformer = routeDef.dataTransformer?.[dataType]?.forRequest;

        if (!transformer) return;

        unValidatedRequest.data = transformer(unValidatedRequest.data);
      }

      transformRequestDataIfNeeded();

      for (const [key, value] of Object.entries(
        unValidatedRequest.searchParams,
      )) {
        const valueArray = Array.isArray(value) ? value : [value];
        unValidatedRequest.searchParams[key] = valueArray;
      }

      let validatedRequest = { ...unValidatedRequest };

      async function fn() {
        try {
          const validatedParams: Record<string, any> = {};
          for (const [key, value] of Object.entries(
            unValidatedRequest.params,
          )) {
            const parser = routeDef.params[key];

            validatedParams[key] = parser
              ? await getValidatorFn(parser, "PARAMS")(value)
              : value;
          }
          validatedRequest.params = validatedParams;

          const validatedSearchParams: Record<string, any> = {};
          for (const [key, parser] of Object.entries(routeDef.searchParams)) {
            const values = unValidatedRequest.searchParams[key];
            const validatedValues = [];

            if (!values) {
              await getValidatorFn(parser, "SEARCH_PARAMS")(undefined);
              continue;
            }

            for (const item of values) {
              validatedValues.push(
                await getValidatorFn(parser, "SEARCH_PARAMS")(item),
              );
            }

            validatedSearchParams[key] = validatedValues;
          }
          validatedRequest.searchParams = validatedSearchParams;

          let validatedData: unknown;
          if (routeDef.iBody) {
            validatedData = await getValidatorFn(
              routeDef.iBody,
              "DATA",
            )(unValidatedRequest.data);
            validatedRequest.data = validatedData;
          }

          let currentCtx = ctx;
          let response: any = {
            headers: {},
            dataType: extractDataType({ dataTypes: routeDef.dataTypes })(
              validatedRequest.headers["accept"],
            ),
          };

          for (const fn of routeDef.middlewares) {
            const middlewareResult = await handleMiddleware(
              fn,
              {
                isError: false,
                ctx: currentCtx,
                request: validatedRequest,
                response,
              },
              routeDef.dataTypes,
            );

            if (!middlewareResult) {
              continue;
            }
            const { ctx, isEnd, ...newResponse } = middlewareResult;
            currentCtx = ctx;
            response = newResponse;

            if (isEnd) {
              break;
            }
          }

          return response;
        } catch (error) {
          let response: any = {
            headers: {},
            dataType: extractDataType({ dataTypes: routeDef.dataTypes })(
              unValidatedRequest.headers["accept"],
            ),
          };
          let currentCtx = ctx;

          for (const fn of routeDef.errorMiddlewares) {
            const middlewareResult = await handleMiddleware(
              fn,
              {
                isError: true,
                error,
                request: unValidatedRequest,
                response: response,
                ctx: currentCtx,
              },
              routeDef.dataTypes,
            );

            if (!middlewareResult) {
              continue;
            }

            const { ctx: newCtx, isEnd, ...newResponse } = middlewareResult;
            currentCtx = newCtx;
            response = newResponse;

            if (isEnd) {
              break;
            }
          }

          return response;
        }
      }

      let response = await fn();

      function transformResponseDataIfNeeded() {
        const shouldTransform =
          transformData === true || transformData == "onlyResponse";
        if (!shouldTransform) return;

        const dataType = response.dataType;

        if (!response.dataType) return;

        const transformer = routeDef.dataTransformer?.[dataType]?.forResponse;

        if (!transformer) return;

        response.data = transformer(response.data);
      }

      transformResponseDataIfNeeded();

      const dataSerializeOptions = {
        data: response.data,
        mediaType: undefined as string | undefined,
        charset: undefined as string | undefined,
        boundary: undefined as string | undefined,
      };
      if (response.headers["content-type"]) {
        const info = extractContentTypeHeader(response.headers["content-type"]);
        dataSerializeOptions.mediaType = info.mediaType;
        dataSerializeOptions.charset = info.charset;
        dataSerializeOptions.boundary = info.boundary;
      } else if (response.dataType) {
        dataSerializeOptions.mediaType = routeDef.dataTypes[response.dataType];
      }

      if (dataSerializeOptions.mediaType) {
        const dataSerializer = routeDef.dataSerializers.get(
          dataSerializeOptions.mediaType,
        );
        if (dataSerializer) {
          const body = await dataSerializer(dataSerializeOptions);
          response.body = body;
        }

        let contentTypeHeader = dataSerializeOptions.mediaType;
        if (dataSerializeOptions.boundary) {
          contentTypeHeader += `;boundary=${dataSerializeOptions.boundary}`;
        }
        if (dataSerializeOptions.charset) {
          contentTypeHeader += `;charset=${dataSerializeOptions.charset}`;
        }

        response.headers["content-type"] = contentTypeHeader;
      }

      // const contentTypeHeader = getContentTypeHeader({
      //   dataTypes: routeDef.dataTypes,
      //   boundary: "--DredgeBoundary",
      // })(response.dataType);
      // if (!response.headers["content-type"] && !!contentTypeHeader) {
      //   response.headers["content-type"] = contentTypeHeader;
      // }

      return response;
    },
  } as DredgeRouter;
}

function nextEndFunction(
  res?: {
    ctx?: any;
    headers?: any;
    status?: number;
    statusText?: string;
    data?: any;
    dataType?: string;
  } & { [key: string]: any },
  previousRes: {
    ctx?: any;
    headers?: any;
    status?: number;
    statusText?: string;
    data?: any;
    dataType?: string;
  } = {
    ctx: {},
    headers: {},
  },
  dataTypes: Record<string, string> = {},
) {
  const generatedHeaders = {};

  if (!res) {
    return previousRes;
  }

  const dataTypeKeys = ["data", ...Object.keys(dataTypes)];
  let data: any = previousRes?.data;
  let dataType = res.dataType ?? previousRes?.dataType;

  if (!res.dataType) {
    for (const item of dataTypeKeys) {
      if (typeof res[item] !== "undefined") {
        data = res[item];
        dataType = item === "data" ? dataType : item;
        break;
      }
    }
  }

  return {
    ctx: { ...(previousRes.ctx || {}), ...(res?.ctx || {}) },
    headers: mergeHeaders(previousRes.headers, res?.headers, generatedHeaders),
    status: res?.status || previousRes?.status,
    statusText: res?.statusText || previousRes?.statusText,
    data,
    dataType,
  };
}

function paramFn(params: Record<string, any>, onlyFirst: boolean = false) {
  return (key?: string) => {
    if (key) {
      const result = params?.[key];

      return onlyFirst ? result?.[0] : result;
    }

    const result = params;

    if (onlyFirst) {
      const onlyFirstResult: Record<string, any> = {};

      Object.entries(result).forEach(([key, value]) => {
        onlyFirstResult[key] = Array.isArray(value) ? value[0] : undefined;
      });

      return onlyFirstResult;
    }

    return result;
  };
}

async function handleMiddleware(
  fn: Function,
  payload: {
    isError?: boolean;
    error?: any;
    request: {
      headers: Record<string, string>;
      method: string;
      data: any;
      dataType?: string;
      url: string;
      params: Record<string, unknown>;
      searchParams: Record<string, unknown[]>;
    };
    response: {
      headers: Record<string, string>;
      data?: any;
      status?: number;
      statusText?: string;
      dataType?: string;
    };
    ctx: any;
  },
  dataTypes: Record<string, string> = {},
): Promise<MiddlewareResult<any, any> | void> {
  const { request, response, ctx, error, isError = false } = payload;

  function createHeaderFunction(headers: Record<string, string>) {
    return function (headerName?: string) {
      if (headerName) {
        const name = headerName?.toLocaleLowerCase();
        if (!Object.hasOwn(headers, name)) return null;
        return headers?.[name];
      }

      return headers;
    };
  }

  const req = {
    header: createHeaderFunction(request.headers),
    method: request.method,
    data: request.data,
    url: request.url,
    dataType: request.dataType,
    param(key?: string) {
      return paramFn(request.params)(key);
    },
    searchParam(key?: string) {
      return paramFn(request.searchParams, true)(key);
    },
    searchParams(key?: string) {
      return paramFn(request.searchParams)(key);
    },
  };

  let isEnd = false;

  const res = {
    status: response.status,
    statusText: response.statusText,
    data: response.data,
    dataType: response.dataType,
    ctx,
    header: createHeaderFunction(response.headers),
    next(nextOptions?: any) {
      return nextEndFunction(
        nextOptions,
        {
          ...response,
          ctx,
        },
        dataTypes,
      );
    },
    end(endOptions?: any) {
      isEnd = true;

      return nextEndFunction(
        endOptions,
        {
          ...response,
          ctx,
        },
        dataTypes,
      );
    },
  };

  let middlewareResult: MiddlewareResult<any, any>;

  if (isError) {
    middlewareResult = await fn(error, req, res);
  } else {
    middlewareResult = await fn(req, res);
  }

  if (middlewareResult) {
    middlewareResult.isEnd = isEnd;
  }

  return middlewareResult;
}

export class ValidationError extends Error {
  issue: any;
  type: ValidationType;

  constructor(
    type: "PARAMS" | "SEARCH_PARAMS" | "DATA" | "RESPONSE_DATA",
    issue: any,
  ) {
    super(`Failed at ${type} validation`);

    this.type = type;
    this.issue = issue;
  }
}

function getValidatorFn(parser: Parser, step: ValidationType) {
  return async (value: any) => {
    const fn = getParseFn(parser);
    try {
      return await fn(value);
    } catch (error) {
      throw new ValidationError(step, error);
    }
  };
}

type ValidationType = "PARAMS" | "SEARCH_PARAMS" | "DATA" | "RESPONSE_DATA";

function extractDataType(options: { dataTypes: Record<string, string> }) {
  return (acceptOrContentTypeHeader?: string) => {
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

function extractContentTypeHeader(contentType?: string) {
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

function getContentTypeHeader(options: {
  dataTypes: Record<string, string>;
  boundary?: string;
}) {
  const { dataTypes = {}, boundary } = options;
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
