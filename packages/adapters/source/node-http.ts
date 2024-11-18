import type * as http from "http";
import { Readable, Stream } from "stream";
import {
  MimeStore,
  deserializeParams as defaultDeserializeParams,
  deserializeQueries as defaultDeserializeQueries,
  defaultJSONBodyParser,
  defaultJsonDataSerializer,
  defaultTextBodyParser,
  defaultTextDataSerializer,
  joinDuplicateHeaders,
  searchParamsToObject,
  trimSlashes,
} from "dredge-common";
import {
  MiddlewareRequest,
  getPathParams,
  useErrorMiddlewares,
  useSuccessMiddlewares,
  useValidate,
} from "dredge-route";
import type { DredgeRouter } from "dredge-types";
import { MaybePromise } from "dredge-types";
import parseUrl from "parseurl";

// TODO: add bodyUsed getter
type BodyParserFunction = (options: {
  readonly body: Readable | null;
  text: () => Promise<string>;
  arrayBuffer: () => Promise<ArrayBuffer>;
  buffer: () => Promise<Buffer>;
  blob: () => Promise<Blob>;
  readonly contentType?: string;
}) => MaybePromise<any>;

type DataSerializerFunction = (options: {
  readonly data: any;
  contentType?: string;
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
  deserializeQueries?: (
    queries: Record<string, string[]>,
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
    deserializeQueries = defaultDeserializeQueries,
    deserializeParams = defaultDeserializeParams,
  } = options;

  const parsedPrefixUrl = new URL(prefixUrl || "relative:///", "relative:///");

  const bodyParsers = new MimeStore<BodyParserFunction>({
    "application/json": defaultJSONBodyParser,
    "text/plain": defaultTextBodyParser,
    ...options.bodyParsers,
  });
  const dataSerializers = new MimeStore<DataSerializerFunction>({
    "application/json": defaultJsonDataSerializer,
    "text/plain": defaultTextDataSerializer,
    ...options.dataSerializers,
  });

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

    const headers = joinDuplicateHeaders(req.headers || {});
    const params = getPathParams(route._def.paths)(pathArray);
    const queries = searchParamsToObject(url.search);

    const parsedParams = deserializeParams(params, routeDef.params);
    const parsedQueries = deserializeQueries(queries, routeDef.queries);

    const middlewareRequest: MiddlewareRequest = {
      url: url.href,
      method: req.method || "get",
      headers,
      params: parsedParams,
      queries: parsedQueries,
      data: undefined,
    };

    const bodyParser = bodyParsers.get(headers["content-type"] || "");
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

        contentType: headers["content-type"],
      });
      middlewareRequest.data = data;
    }

    try {
      const validatedRequest = await useValidate(route)(middlewareRequest);
      const middlewareResponse = await useSuccessMiddlewares(route)(
        validatedRequest,
        {
          headers: {},
          ctx,
        },
      );

      let body: any = null;

      const dataSerializeOptions = {
        data: middlewareResponse.data,
        contentType: middlewareResponse.headers["content-type"],
      };

      const dataSerializer = dataSerializers.get(
        dataSerializeOptions.contentType || "",
      );
      if (dataSerializer) {
        body = await dataSerializer(dataSerializeOptions as any);
      }

      middlewareRequest.headers["content-type"] =
        dataSerializeOptions.contentType ?? "";

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
          ctx,
        },
      );

      let body: any = null;
      const dataSerializeOptions = {
        data: middlewareResponse.data,
        contentType: middlewareResponse.headers["content-type"],
      };

      const dataSerializer = dataSerializers.get(
        dataSerializeOptions.contentType || "",
      );
      if (dataSerializer) {
        body = await dataSerializer(dataSerializeOptions as any);
      }

      middlewareRequest.headers["content-type"] =
        dataSerializeOptions.contentType ?? "";

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

async function toArrayBuffer(body: Readable) {
  const { buffer, byteOffset, byteLength } = await toBuffer(body);
  return buffer.slice(byteOffset, byteOffset + byteLength);
}
