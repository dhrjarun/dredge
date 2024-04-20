import {
  Transformer,
  AnyRoute,
  trimSlashes,
  ResolverResult,
  DredgeApi,
} from "@dredge/common";

export async function handleFetchRequest<Context extends object = {}>(options: {
  req: Request;
  api: DredgeApi<Context, AnyRoute[]>;
  transformer?: Partial<Transformer>;
  ctx: Context;
  prefixUrl: string | URL;
}): Promise<Response> {
  const { req, api, ctx } = options;

  const transformer = populateTransformer(options.transformer);
  const prefixUrl =
    options.prefixUrl instanceof URL
      ? options.prefixUrl
      : new URL(options.prefixUrl);
  const url = new URL(req.url!);
  const initialPathname = trimSlashes(prefixUrl.pathname);
  if (!url.pathname.startsWith(initialPathname)) {
    throw "Invalid url";
  }
  const path = trimSlashes(url.pathname).slice(initialPathname.length);
  const data = await getDataFromRequestOrResponse(req, {
    transformer,
  });

  const headers = Object.fromEntries(req.headers);
  const searchParams = transformer.searchParams.deserialize(url.searchParams);

  const result = await api.resolveRoute(path, {
    method: req.method,
    ctx,
    data,
    headers,
    searchParams,
  });

  return createResponseFromResolverResult(result, { transformer });
}

async function getDataFromRequestOrResponse(
  reqOrRes: {
    headers: Headers;
    text: () => Promise<string>;
    formData: () => Promise<FormData>;
  },
  options: { transformer: Partial<Transformer> }
) {
  const transformer = populateTransformer(options.transformer);
  const contentType = reqOrRes.headers.get("Content-Type");
  let data: any;

  if (contentType?.startsWith("application/json")) {
    const text = await reqOrRes.text();
    if (!text) {
      data = null;
    }
    data = transformer.json.deserialize(text);
  }
  if (contentType?.startsWith("multipart/form-data")) {
    data = transformer.formData.deserialize(await reqOrRes.formData());
  }

  if (contentType?.startsWith("application/x-www-form-urlencoded")) {
    const searchParams = new URLSearchParams(await reqOrRes.text());
    data = transformer.searchParams.deserialize(searchParams);
  }

  return Promise.resolve(data);
}

export async function createResponseFromResolverResult(
  result: ResolverResult<any>,
  options: {
    transformer?: Partial<Transformer>;
  }
) {
  const transformer = populateTransformer(options.transformer);

  const { data, ...rest } = result;
  const contentType = result.headers?.["Content-Type"];

  let dataOrError: any;
  try {
    dataOrError = await data();
  } catch (err) {
    dataOrError = err;
  }

  if (contentType?.startsWith("application/json")) {
    const json = transformer.json.serialize(dataOrError);
    return new Response(json, {
      ...rest,
    });
  }
  if (contentType?.startsWith("multipart/form-data")) {
    const form = transformer.formData.serialize(dataOrError);
    return new Response(form, {
      ...rest,
    });
  }
  if (contentType?.startsWith("application/x-www-form-urlencoded")) {
    const searchParams = new URLSearchParams(dataOrError);
    const form = transformer.searchParams.serialize(searchParams);
    return new Response(form, {
      ...rest,
    });
  }

  if (
    typeof dataOrError === "string"
    // typeof dataOrError === "string" ||
    // dataOrError instanceof Buffer ||
    // dataOrError instanceof Uint8Array
  ) {
    return new Response(dataOrError, {
      ...rest,
    });
  }

  throw "Invalid data or no ContentType provided";
}

function populateTransformer(
  transformer: Partial<Transformer> = {}
): Transformer {
  const _transformer: Transformer = {
    json: {
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    },
    formData: {
      serialize: (object) => {
        const formData = new FormData();
        Object.entries(object).forEach(([key, value]) => {
          if (typeof value === "string" || value instanceof Blob) {
            formData.append(key, value);
          } else {
            throw "serialization failed";
          }
        });

        return formData;
      },
      deserialize: (object) => {
        return Object.fromEntries(object.entries());
      },
    },
    searchParams: {
      serialize: (object) => new URLSearchParams(object),
      deserialize: (object) => Object.fromEntries(object.entries()),
    },
  };
  Object.entries(transformer).forEach(([key, value]) => {
    if (value) {
      (_transformer as any)[key] = value;
    }
  });

  return _transformer;
}
