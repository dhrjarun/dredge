import { mergeDredgeHeaders } from "dredge-common";
import type {
  AnyRoute,
  Parser,
  AnyMiddlewareResponse,
  AnyMiddlewareRequest,
  RouteBuilderDef,
} from "dredge-types";
import { ResponseUpdate } from "dredge-types";
import { getParseFn } from "./parser";

function middlewareRequestFactory(request: any): AnyMiddlewareRequest {
  return {
    url: request.url,
    method: request.method,
    data: request.data,
    dataType: request.dataType,
    header: (headerName?: string) => {
      return headerFn(request.headers)(headerName) as any;
    },
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
}

function middlewareResponseFactory(
  response: any,
  routeDef: RouteBuilderDef,
): AnyMiddlewareResponse {
  const dataTypes = routeDef.dataTypes;

  return {
    header(headerName?: string) {
      const headers = response.headers;
      if (headerName) {
        const name = headerName?.toLocaleLowerCase();
        if (!Object.hasOwn(headers, name)) return null;
        return headers?.[name];
      }

      return headers;
    },
    status: response.status,
    statusText: response.statusText,
    data: response.data,
    dataType: response.dataType,
    ctx: response.ctx,
    up(responseUpdate?: any) {
      const generatedHeaders: Record<string, string> = {};

      if (!responseUpdate) {
        return response;
      }

      const dataTypeKeys = ["data", ...dataTypes.keys()];
      let data: any = response?.data;
      let dataType = responseUpdate.dataType ?? response?.dataType;

      if (!responseUpdate.dataType) {
        for (const item of dataTypeKeys) {
          if (typeof responseUpdate[item] !== "undefined") {
            data = responseUpdate[item];
            dataType = item === "data" ? dataType : item;
            break;
          }
        }
      }

      const dataTypeFromHeader = dataTypes.getDataTypeFromContentType(
        responseUpdate?.headers?.["content-type"] || "",
      );
      if (dataTypeFromHeader) {
        dataType = dataTypeFromHeader;
      } else if (dataType) {
        const ct = dataTypes.getContentTypeHeader(dataType);
        if (ct) {
          generatedHeaders["content-type"] = ct;
        }
      }

      response.ctx = {
        ...(response.ctx || {}),
        ...(responseUpdate?.ctx || {}),
      };
      response.headers = mergeDredgeHeaders(
        response.headers,
        responseUpdate?.headers,
        generatedHeaders,
      );
      response.status = responseUpdate?.status || response?.status;
      response.statusText = responseUpdate?.statusText || response?.statusText;
      response.data = data;
      response.dataType = dataType;

      return new ResponseUpdate();
    },
  };
}

function headerFn(headers: Record<string, string>) {
  return function (headerName?: string) {
    if (headerName) {
      const name = headerName?.toLocaleLowerCase();
      if (!Object.hasOwn(headers, name)) return null;
      return headers?.[name] ?? null;
    }

    return headers;
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

export class ValidationError extends Error {
  issue: any;
  type: ValidationType;

  constructor(
    type: "PARAMS" | "SEARCH_PARAMS" | "DATA" | "RESPONSE_DATA",
    issue: any,
  ) {
    super();

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

export type DredgeRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  params: Record<string, any>;
  queries: Record<string, any[]>;
  data?: any;
  dataType?: string;
};

export type DredgeReponse = {
  headers: Record<string, string>;
  data?: any;
  status?: number;
  statusText?: string;
  dataType?: string;
  ctx?: any;
};

export function useValidate(route: AnyRoute) {
  const routeDef = route._def;

  return async (unValidatedRequest: DredgeRequest) => {
    let validatedRequest: DredgeRequest = { ...unValidatedRequest };

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

function getRequestResponseObject(
  requestInit: Partial<DredgeRequest> = {},
  responseInit: Partial<DredgeReponse> = {},
  routeDef: RouteBuilderDef,
): {
  request: DredgeRequest;
  response: DredgeReponse;
} {
  const response: DredgeReponse = {
    headers: responseInit.headers ?? {},
    data: responseInit.data,
    status: responseInit.status,
    statusText: responseInit.statusText,
    dataType: responseInit.dataType,
    ctx: responseInit.ctx ?? {},
  };

  const request: DredgeRequest = {
    headers: requestInit.headers ?? {},
    data: requestInit.data,
    dataType: requestInit.dataType,
    method: requestInit.method || "get",
    url: requestInit.url || "",
    params: requestInit.params || {},
    queries: requestInit.queries || {},
  };

  const dataTypes = routeDef.dataTypes;
  const contentType = requestInit.headers?.["content-type"] || "";
  const accept = requestInit.headers?.["accept"] || "";

  if (!request.dataType) {
    request.dataType = dataTypes.getDataTypeFromContentType(contentType);
  }
  if (!response.dataType) {
    response.dataType = dataTypes.getDataTypeFromAccept(accept);
  }

  return { request, response };
}

export function useSuccessMiddlewares(route: AnyRoute) {
  const routeDef = route._def;

  return async (
    requestInit: Partial<DredgeRequest> = {},
    responseInit: Partial<DredgeReponse> = {},
  ): Promise<DredgeReponse> => {
    const { request, response } = getRequestResponseObject(
      requestInit,
      responseInit,
      routeDef,
    );

    const req = middlewareRequestFactory(request);
    const res = middlewareResponseFactory(response, routeDef);

    for (const fn of routeDef.middlewares) {
      await fn(req, res);
    }

    return response;
  };
}

export function useErrorMiddlewares(route: AnyRoute) {
  const routeDef = route._def;
  const errorMiddlewares = routeDef.errorMiddlewares;

  return async (
    error: any,
    requestInit: Partial<DredgeRequest> = {},
    responseInit: Partial<DredgeReponse> = {},
  ): Promise<DredgeReponse> => {
    const { request, response } = getRequestResponseObject(
      requestInit,
      responseInit,
      routeDef,
    );

    const req = middlewareRequestFactory(request);
    const res = middlewareResponseFactory(response, routeDef);

    for (const fn of errorMiddlewares) {
      await fn(error, req, res);
    }

    return response;
  };
}
