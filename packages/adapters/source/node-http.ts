import type * as http from "http";
import { Readable, Stream } from "stream";
import {
  MimeStore,
  deserializeParams as defaultDeserializeParams,
  deserializeSearchParams as defaultDeserializeSearchParams,
  joinDuplicateHeaders,
  searchParamsToObject,
  trimSlashes,
} from "dredge-common";
import {
  DredgeRouter,
  MiddlewareRequest,
  extractContentTypeHeader,
  getDataType,
  getPathParams,
  useErrorMiddlewares,
  useSuccessMiddlewares,
  useValidate,
} from "dredge-route";
import { MaybePromise } from "dredge-types";
import parseUrl from "parseurl";

// TODO: add bodyUsed getter
type BodyParserFunction = (options: {
  readonly body: Readable | null;
  text: () => Promise<string>;
  arrayBuffer: () => Promise<ArrayBuffer>;
  buffer: () => Promise<Buffer>;
  blob: () => Promise<Blob>;
  readonly mediaType: string;
  readonly boundary?: string;
  readonly charset?: string;
}) => MaybePromise<any>;

type DataSerializerFunction = (options: {
  readonly data: any;
  mediaType: string;
  charset?: string;
  boundary?: string;
}) => MaybePromise<string | Readable>;

export interface CreateNodeHttpRequestHandlerOptions<Context extends object> {
  router: DredgeRouter;
  ctx?: Context;
  prefixUrl?: string;
  bodyParsers?: {
    [key: string]: BodyParserFunction;
  };
  dataSerializers?: {
    [key: string]: DataSerializerFunction;
  };
  deserializeSearchParams?: (
    searchParams: Record<string, string[]>,
    schema: Record<string, any>,
  ) => Record<string, any[]>;
  deserializeParams?: (
    params: Record<string, string>,
    schema: Record<string, any>,
  ) => Record<string, any>;
}

export function createNodeHttpRequestHandler<Context extends object = {}>(
  options: CreateNodeHttpRequestHandlerOptions<Context>,
) {
  const {
    router,
    ctx = {},
    prefixUrl,
    deserializeParams = defaultDeserializeParams,
    deserializeSearchParams = defaultDeserializeSearchParams,
  } = options;

  const parsedPrefixUrl = new URL(prefixUrl || "relative:///", "relative:///");

  const bodyParsers = new MimeStore<BodyParserFunction>(options.bodyParsers);
  const dataSerializers = new MimeStore<DataSerializerFunction>(
    options.dataSerializers,
  );

  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const url = parseUrl(req);

    if (!url || !url.pathname) {
      res.statusCode = 404;
      res.statusMessage = "Not Found";
      res.end();
      return;
    }

    const path = trimSlashes(
      url.pathname.slice(parsedPrefixUrl.pathname.length),
    );
    const pathArray = path.split("/");

    const route = router.find(req.method || "get", pathArray);
    if (!route) {
      res.statusCode = 404;
      res.statusMessage = "Not Found";
      res.end();
      return;
    }

    const routeDef = route._def;

    if (!route) {
      res.statusCode = 404;
      res.statusMessage = "Not Found";
      res.end();
      return;
    }

    const headers = joinDuplicateHeaders(req.headers || {});

    const params = getPathParams(route._def.paths)(pathArray);
    const searchParams = searchParamsToObject(url.search);

    const parsedParams = deserializeParams(params, routeDef.params);
    const parsedSearchParams = deserializeSearchParams(
      searchParams,
      routeDef.searchParams,
    );

    const middlewareRequest: MiddlewareRequest = {
      url: url.href,
      method: req.method || "get",
      headers,
      params: parsedParams,
      searchParams: parsedSearchParams,
      data: undefined,
      dataType: getDataType(route._def.dataTypes)(headers["content-type"]),
    };

    const contentTypeInfo = extractContentTypeHeader(headers["content-type"]);
    if (contentTypeInfo?.["mediaType"]) {
      const bodyParser = bodyParsers.get(contentTypeInfo["mediaType"]);
      if (bodyParser) {
        const data = await bodyParser({
          body: req,
          buffer: () => {
            return toBuffer(req);
          },
          text: async () => {
            const buffer = await toBuffer(req);
            return new TextDecoder().decode(buffer);
          },
          arrayBuffer: async () => {
            return toArrayBuffer(req);
          },
          blob: async () => {
            const ct = headers["content-type"];
            const buf = await toArrayBuffer(req);

            return new Blob([buf], {
              type: ct,
            });
          },

          mediaType: contentTypeInfo.mediaType!,
          boundary: contentTypeInfo.boundary,
          charset: contentTypeInfo.charset,
        });
        middlewareRequest.data = data;
      }
    }

    try {
      const validatedRequest = await useValidate(route)(middlewareRequest);
      const middlewareResponse = await useSuccessMiddlewares(route)(
        validatedRequest,
        {
          headers: {},
          dataType: getDataType(route._def.dataTypes)(
            validatedRequest.headers["accept"],
          ),
          ctx,
        },
      );

      let body: any = null;

      const dataSerializeOptions = {
        data: middlewareResponse.data,
        mediaType: undefined as string | undefined,
        charset: undefined as string | undefined,
        boundary: undefined as string | undefined,
      };
      if (middlewareResponse.headers["content-type"]) {
        const info = extractContentTypeHeader(
          middlewareResponse.headers["content-type"],
        );
        dataSerializeOptions.mediaType = info.mediaType;
        dataSerializeOptions.charset = info.charset;
        dataSerializeOptions.boundary = info.boundary;
      } else if (middlewareResponse.dataType) {
        dataSerializeOptions.mediaType =
          routeDef.dataTypes[middlewareResponse.dataType];
      }
      if (dataSerializeOptions.mediaType) {
        const dataSerializer = dataSerializers.get(
          dataSerializeOptions.mediaType,
        );
        if (dataSerializer) {
          body = await dataSerializer(dataSerializeOptions as any);
        }

        let contentTypeHeader = dataSerializeOptions.mediaType;
        if (dataSerializeOptions.boundary) {
          contentTypeHeader += `;boundary=${dataSerializeOptions.boundary}`;
        }
        if (dataSerializeOptions.charset) {
          contentTypeHeader += `;charset=${dataSerializeOptions.charset}`;
        }

        middlewareRequest.headers["content-type"] = contentTypeHeader;
      }

      if (middlewareResponse.status) {
        res.statusCode = middlewareResponse.status;
      }
      if (middlewareResponse.statusText) {
        res.statusMessage = middlewareResponse.statusText;
      }
      Object.entries(middlewareResponse.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      if (body) {
        res.write(body);
      }
      res.end();
    } catch (error) {
      const middlewareResponse = await useErrorMiddlewares(route)(
        error,
        middlewareRequest,
        {
          headers: {},
          dataType: getDataType(route._def.dataTypes)(
            middlewareRequest.headers["accept"],
          ),
          ctx,
        },
      );

      let body: any = null;
      const dataSerializeOptions = {
        data: middlewareResponse.data,
        mediaType: undefined as string | undefined,
        charset: undefined as string | undefined,
        boundary: undefined as string | undefined,
      };
      if (middlewareResponse.headers["content-type"]) {
        const info = extractContentTypeHeader(
          middlewareResponse.headers["content-type"],
        );
        dataSerializeOptions.mediaType = info.mediaType;
        dataSerializeOptions.charset = info.charset;
        dataSerializeOptions.boundary = info.boundary;
      } else if (middlewareResponse.dataType) {
        dataSerializeOptions.mediaType =
          routeDef.dataTypes[middlewareResponse.dataType];
      }
      if (dataSerializeOptions.mediaType) {
        const dataSerializer = dataSerializers.get(
          dataSerializeOptions.mediaType,
        );
        if (dataSerializer) {
          body = await dataSerializer(dataSerializeOptions as any);
        }

        let contentTypeHeader = dataSerializeOptions.mediaType;
        if (dataSerializeOptions.boundary) {
          contentTypeHeader += `;boundary=${dataSerializeOptions.boundary}`;
        }
        if (dataSerializeOptions.charset) {
          contentTypeHeader += `;charset=${dataSerializeOptions.charset}`;
        }

        middlewareRequest.headers["content-type"] = contentTypeHeader;
      }

      if (middlewareResponse.status) {
        res.statusCode = middlewareResponse.status;
      }
      if (middlewareResponse.statusText) {
        res.statusMessage = middlewareResponse.statusText;
      }
      Object.entries(middlewareResponse.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      if (body) {
        res.write(body);
      }
      res.end();
    }
  };
}

// https://github.com/node-fetch/node-fetch/blob/main/src/body.js#L194
async function toBuffer(body: Readable, size: number = 0) {
  if (!(body instanceof Stream)) {
    return Buffer.alloc(0);
  }

  const chunks: any[] = [];
  let chunkBytes: number = 0;

  try {
    for await (const chunk of body) {
      if (size > 0 && chunkBytes + chunk.length > size) {
        const error = new Error(`content size for body over limit: ${size}`);
        body.destroy(error);
        throw error;
      }

      chunkBytes += chunk.length;
      chunks.push(chunk);
    }
  } catch (error) {
    throw error;
  }

  if (body.readableEnded === true) {
    try {
      if (chunks.every((c) => typeof c === "string")) {
        return Buffer.from(chunks.join(""));
      }

      return Buffer.concat(chunks, chunkBytes);
    } catch (error) {
      throw new Error(`Could not create Buffer from response body`, {
        cause: error,
      });
    }
  } else {
    throw new Error(`Premature close of server response`);
  }
}

async function toArrayBuffer(body: Readable, size: number = 0) {
  const { buffer, byteOffset, byteLength } = await toBuffer(body);
  return buffer.slice(byteOffset, byteOffset + byteLength);
}
