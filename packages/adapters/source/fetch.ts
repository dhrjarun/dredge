import {
  MimeStore,
  deserializeParams as defaultDeserializeParams,
  deserializeQueries as defaultDeserializeQueries,
  defaultJSONBodyParser,
  defaultJsonDataSerializer,
  defaultTextBodyParser,
  defaultTextDataSerializer,
  searchParamsToObject,
  trimSlashes,
} from "dredge-common";
import {
  DredgeRequest,
  getPathParams,
  useErrorMiddlewares,
  useSuccessMiddlewares,
  useValidate,
} from "dredge-route";
import type { DredgeRouter } from "dredge-types";
import { MaybePromise } from "dredge-types";
import { ReadableStream } from "stream/web";

// TODO: add bodyUsed getter
type BodyParserFunction = (options: {
  readonly body: ReadableStream<any> | null;
  arrayBuffer: () => Promise<ArrayBuffer>;
  formData: () => Promise<FormData>;
  blob: () => Promise<Blob>;
  text: () => Promise<string>;
  readonly contentType?: string;
}) => MaybePromise<any>;

type DataSerializerFunction = (options: {
  readonly data: any;
  contentType?: string;
}) => MaybePromise<
  string | ReadableStream<Uint8Array> | ArrayBuffer | Blob | FormData
>;

export interface CreateFetchRequestHandlerOptions<Context extends object> {
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

export function createFetchRequestHandler<Context extends object = {}>(
  options: CreateFetchRequestHandlerOptions<Context>,
) {
  const {
    router,
    ctx = {},
    prefixUrl,
    deserializeParams = defaultDeserializeParams,
    deserializeQueries = defaultDeserializeQueries,
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

  return async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const path = trimSlashes(
      url.pathname.slice(parsedPrefixUrl.pathname.length),
    );
    const pathArray = path.split("/");

    const route = router.find(req.method || "get", pathArray);
    if (!route) {
      return new Response("Not Found", {
        status: 404,
        statusText: "Not Found",
      });
    }

    const routeDef = route._def;

    const headers = Object.fromEntries(req.headers);
    const params = getPathParams(route._def.paths)(pathArray);
    const queries = searchParamsToObject(url.search);

    const parsedParams = deserializeParams(params, routeDef.params);
    const parsedQueries = deserializeQueries(queries, routeDef.queries);

    const middlewareRequest: DredgeRequest = {
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
        body: req.body,
        text: req.text.bind(req),
        arrayBuffer: req.arrayBuffer.bind(req),
        formData: req.formData.bind(req),
        blob: req.blob.bind(req),

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

      return new Response(body, {
        status: middlewareResponse.status,
        statusText: middlewareResponse.statusText,
        headers: middlewareResponse.headers,
      });
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

      return new Response(body, {
        headers: middlewareRequest.headers,
        status: middlewareResponse.status,
        statusText: middlewareResponse.statusText,
      });
    }
  };
}
