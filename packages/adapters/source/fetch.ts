import {
  MimeStore,
  deserializeParams as defaultDeserializeParams,
  deserializeSearchParams as defaultDeserializeSearchParams,
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
import { ReadableStream } from "stream/web";

// TODO: add bodyUsed getter
type BodyParserFunction = (options: {
  readonly body: ReadableStream<any> | null;
  arrayBuffer: () => Promise<ArrayBuffer>;
  formData: () => Promise<FormData>;
  blob: () => Promise<Blob>;
  text: () => Promise<string>;
  readonly mediaType: string;
  readonly boundary?: string;
  readonly charset?: string;
}) => Promise<any>;

type DataSerializerFunction = (options: {
  readonly data: any;
  mediaType: string;
  charset?: string;
  boundary?: string;
}) => Promise<
  string | ReadableStream<Uint8Array> | ArrayBuffer | Blob | FormData
>;

export async function handleFetchRequest<Context extends object = {}>(options: {
  req: Request;
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
}): Promise<Response> {
  const {
    req,
    router,
    prefixUrl,
    ctx = {},
    deserializeParams = defaultDeserializeParams,
    deserializeSearchParams = defaultDeserializeSearchParams,
  } = options;

  const bodyParsers = new MimeStore<BodyParserFunction>(options.bodyParsers);
  const dataSerializers = new MimeStore<DataSerializerFunction>(
    options.dataSerializers,
  );

  const parsedUrl = new URL(req.url);
  const parsedPrefixUrl = new URL(prefixUrl || "relative://");
  const path = trimSlashes(parsedUrl.pathname).slice(
    trimSlashes(parsedPrefixUrl.pathname).length,
  );
  const pathArray = path.split("/");

  const route = router.find(req.method, pathArray);
  if (!route)
    return new Response("Not Found", {
      status: 404,
      statusText: "Not Found",
    });

  const routeDef = route._def;
  const headers = Object.fromEntries(req.headers);

  const params = getPathParams(route._def.paths)(pathArray);
  const searchParams = searchParamsToObject(parsedUrl.searchParams);

  const parsedParams = deserializeParams(params, routeDef.params);
  const parsedSearchParams = deserializeSearchParams(
    searchParams,
    routeDef.searchParams,
  );

  const middlewareRequest: MiddlewareRequest = {
    url: req.url,
    method: req.method,
    headers,
    params: parsedParams,
    searchParams: parsedSearchParams,
    data: undefined,
    dataType: getDataType(route._def.dataTypes)(headers["content-type"]),
  };

  const contentTypeInfo = extractContentTypeHeader(headers["content-type"]);
  if (contentTypeInfo?.mediaType) {
    const bodyParser = bodyParsers.get(contentTypeInfo.mediaType);
    if (bodyParser) {
      const data = await bodyParser({
        body: req.body,
        text: req.text.bind(req),
        arrayBuffer: req.arrayBuffer.bind(req),
        formData: req.formData.bind(req),
        blob: req.blob.bind(req),

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

    return new Response(body, {
      status: middlewareResponse.status,
      statusText: middlewareResponse.statusText,
      headers: middlewareRequest.headers,
    });
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

    return new Response(body, {
      headers: middlewareRequest.headers,
      status: middlewareResponse.status,
      statusText: middlewareResponse.statusText,
    });
  }
}
