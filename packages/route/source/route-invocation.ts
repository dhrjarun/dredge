import { DataTypes, mergeDredgeHeaders } from "dredge-common";
import type { AnyRoute, MiddlewareResult, Parser } from "dredge-types";
import { getParseFn } from "./parser";

function nextEndFunction(
  res?: MiddlewareResponse & { [key: string]: any },
  previousRes: MiddlewareResponse = {
    ctx: {},
    headers: {},
  },
  dataTypes: DataTypes = new DataTypes(),
) {
  const generatedHeaders: Record<string, string> = {};

  if (!res) {
    return previousRes;
  }

  const dataTypeKeys = ["data", ...dataTypes.keys()];
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

  const dataTypeFromHeader = dataTypes.getDataTypeFromContentType(
    res?.headers?.["content-type"] || "",
  );
  if (dataTypeFromHeader) {
    dataType = dataTypeFromHeader;
  } else if (dataType) {
    const ct = dataTypes.getContentTypeHeader(dataType);
    if (ct) {
      generatedHeaders["content-type"] = ct;
    }
  }

  return {
    ctx: { ...(previousRes.ctx || {}), ...(res?.ctx || {}) },
    headers: mergeDredgeHeaders(
      previousRes.headers,
      res?.headers,
      generatedHeaders,
    ),
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
  dataTypes: DataTypes,
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
    query(key?: string) {
      return paramFn(request.queries, true)(key);
    },
    queries(key?: string) {
      return paramFn(request.queries)(key);
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
  queries: Record<string, any[]>;
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

    const validatedQueries: Record<string, any> = {
      ...unValidatedRequest.queries, // TODO: add an option to whether or not to pass query if their schema is not defined
    };
    for (const [key, parser] of Object.entries(routeDef.queries)) {
      const values = unValidatedRequest.queries[key];
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

      validatedQueries[key] = validatedValues;
    }
    validatedRequest.queries = validatedQueries;

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
        ...response.ctx,
      },
    };

    const request = {
      ...validatedRequest,
    };

    const dataTypes = routeDef.dataTypes;
    const contentType = validatedRequest.headers["content-type"] || "";
    const accept = validatedRequest.headers["accept"] || "";
    if (!request.dataType) {
      request.dataType = dataTypes.getDataTypeFromContentType(contentType);
    }
    if (!_response.dataType) {
      _response.dataType = dataTypes.getDataTypeFromAccept(accept);
    }

    for (const fn of routeDef.middlewares) {
      const middlewareResult = await handleMiddleware(
        fn,
        {
          isError: false,
          request,
          response: _response,
        },
        routeDef.dataTypes as any,
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
    };

    let _response = {
      ...response,
      ctx: {
        ...response.ctx,
      },
    };

    const dataTypes = routeDef.dataTypes;
    const contentType = unValidatedRequest.headers["content-type"] || "";
    const accept = unValidatedRequest.headers["accept"] || "";

    if (!request.dataType) {
      request.dataType = dataTypes.getDataTypeFromContentType(contentType);
    }
    if (!_response.dataType) {
      _response.dataType = dataTypes.getDataTypeFromAccept(accept);
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
        dataTypes as any,
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
