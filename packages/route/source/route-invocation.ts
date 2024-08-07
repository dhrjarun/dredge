import { AnyRoute, MiddlewareResult, Parser } from "@dredge/types";
import { getParseFn } from "./parser";
import { mergeHeaders } from "./utils/headers";

function nextEndFunction(
  res?: MiddlewareResponse & { [key: string]: any },
  previousRes: MiddlewareResponse = {
    ctx: {},
    headers: {},
  },
  dataTypes: Record<string, string> = {},
) {
  const generatedHeaders: Record<string, string> = {};

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

  const dataTypeFromHeader = getDataType(dataTypes)(
    res?.headers?.["content-type"],
  );
  if (dataTypeFromHeader) {
    dataType = dataTypeFromHeader;
  } else if (dataType) {
    const ct = getContentTypeHeader(dataTypes)(dataType);
    if (ct) {
      generatedHeaders["content-type"] = ct;
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
    request: MiddlewareRequest;
    response: MiddlewareResponse & { [key: string]: any };
  },
  dataTypes: Record<string, string> = {},
): Promise<MiddlewareResult<any, any> | void> {
  const { request, response, error, isError = false } = payload;

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
    header: createHeaderFunction(response.headers),
    ctx: response.ctx,
    next(nextOptions?: any) {
      return nextEndFunction(
        nextOptions,
        {
          ...response,
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

export function getDataType(dataTypes: Record<string, string>) {
  return (acceptOrContentTypeHeader?: string) => {
    if (!acceptOrContentTypeHeader) return;

    const mime = acceptOrContentTypeHeader.trim().split(";")[0];
    if (!mime) return;
    // const mimeRegex = /[a-zA-Z\-]+\/[a-zA-z\-]+/g;
    // if(mimeRegex.test(mime)) return;

    for (const [key, value] of Object.entries(dataTypes)) {
      if (value == mime) {
        return key;
      }
    }
  };
}

export function extractContentTypeHeader(contentType?: string) {
  const info: Record<string, string | undefined> = {
    charset: undefined,
    boundary: undefined,
    mediaType: undefined,
  };
  if (!contentType) return info;

  const splitted = contentType.trim().split(";");

  info["mediaType"] = splitted[0];

  for (const item of splitted.slice(1)) {
    const [key, value] = item.trim().split("=");
    if (key) {
      info[key] = value;
    }
  }

  return info;
}

function getContentTypeHeader(dataTypes: Record<string, string>) {
  return (dataType?: string) => {
    if (!dataType) return;
    if (!(dataType in dataTypes)) return;

    const mime = dataTypes[dataType]?.trim().toLowerCase();

    if (!mime) return;
    const mimeRegex = /[a-zA-Z\-]+\/[a-zA-z\-]+/g;
    if (!mimeRegex.test(mime)) return;

    // const [mimeType] = mime.split("/");

    // if (mimeType?.includes("multipart")) {
    //   return boundary ? `${mime};boundary=${boundary}` : undefined;
    // }

    return mime;
  };
}

export function getPathParams(routePath: string[]) {
  return (pathArray: string[]) => {
    const params: Record<string, string> = routePath.reduce(
      (acc: any, item: string, index: number) => {
        if (item.startsWith(":")) {
          acc[item.replace(":", "")] = pathArray[index];
        }
        return acc;
      },
      {},
    );

    return params;
  };
}

export type MiddlewareRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  params: Record<string, any>;
  searchParams: Record<string, any[]>;
  data?: any;
  dataType?: string;
};

export type MiddlewareResponse = {
  headers: Record<string, string>;
  data?: any;
  status?: number;
  statusText?: string;
  dataType?: string;
  ctx?: any;
};

export function useValidate(route: AnyRoute) {
  const routeDef = route._def;

  return async (unValidatedRequest: MiddlewareRequest) => {
    let validatedRequest: MiddlewareRequest = { ...unValidatedRequest };

    const validatedParams: Record<string, any> = {};
    for (const [key, value] of Object.entries(unValidatedRequest.params)) {
      const parser = routeDef.params[key];

      validatedParams[key] = parser
        ? await getValidatorFn(parser, "PARAMS")(value)
        : value;
    }
    validatedRequest.params = validatedParams;

    const validatedSearchParams: Record<string, any> = {};
    for (const [key, parser] of Object.entries(routeDef.searchParams)) {
      const values = unValidatedRequest.searchParams[key];
      const validatedValues: any[] = [];

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

    return validatedRequest;
  };
}

export function useSuccessMiddlewares(route: AnyRoute) {
  const routeDef = route._def;

  return async (
    validatedRequest: MiddlewareRequest,
    response: MiddlewareResponse = { headers: {} },
  ) => {
    let _response = {
      ...response,
      ctx: {
        ...routeDef.defaultContext,
        ...response.ctx,
      },
    };

    const request = {
      ...validatedRequest,
    };

    if (!request.dataType) {
      request.dataType = getDataType(routeDef.dataTypes)(
        validatedRequest.headers["content-type"],
      );
    }
    if (!_response.dataType) {
      _response.dataType = getDataType(routeDef.dataTypes)(
        validatedRequest.headers["accept"],
      );
    }

    for (const fn of routeDef.middlewares) {
      const middlewareResult = await handleMiddleware(
        fn,
        {
          isError: false,
          request,
          response: _response,
        },
        routeDef.dataTypes,
      );

      if (!middlewareResult) {
        continue;
      }
      const { isEnd, ...newResponse } = middlewareResult;
      _response = newResponse;

      if (isEnd) {
        break;
      }
    }

    return _response;
  };
}

export function useErrorMiddlewares(route: AnyRoute) {
  const routeDef = route._def;
  const errorMiddlewares = routeDef.errorMiddlewares;

  return async (
    error: any,
    unValidatedRequest: MiddlewareRequest,
    response: MiddlewareResponse = { headers: {} },
  ) => {
    const request = {
      ...unValidatedRequest,
      dataType: getDataType(routeDef.dataTypes)(
        unValidatedRequest.headers["content-type"],
      ),
    };

    let _response = {
      ...response,
      ctx: {
        ...routeDef.defaultContext,
        ...response.ctx,
      },
    };

    if (!request.dataType) {
      request.dataType = getDataType(routeDef.dataTypes)(
        unValidatedRequest.headers["content-type"],
      );
    }
    if (!_response.dataType) {
      _response.dataType = getDataType(routeDef.dataTypes)(
        request.headers["accept"],
      );
    }

    for (const fn of errorMiddlewares) {
      const middlewareResult = await handleMiddleware(
        fn,
        {
          isError: true,
          error,
          request,
          response: _response,
        },
        routeDef.dataTypes,
      );

      if (!middlewareResult) {
        continue;
      }

      const { isEnd, ...newResponse } = middlewareResult;
      _response = newResponse;

      if (isEnd) {
        break;
      }
    }

    return _response;
  };
}
