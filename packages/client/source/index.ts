import {
  DredgeApi,
  DredgeClient,
  Transformer,
  inferRouteUnion,
  ResponsePromise,
  defaultTransformer,
} from "@dredge/common";

export const isResponseOk = (response: any): boolean => {
  const { statusCode } = response;
  const { followRedirect } = response.request.options;
  const shouldFollow =
    typeof followRedirect === "function"
      ? followRedirect(response)
      : followRedirect;
  const limitStatusCode = shouldFollow ? 299 : 399;

  return (
    (statusCode >= 200 && statusCode <= limitStatusCode) || statusCode === 304
  );
};

export function dredgeHttpClient<Api extends DredgeApi<any>>(options: {
  prefixUrl: URL | string;
  transformer: Partial<Transformer>;
  fetch: (
    input: string | URL | globalThis.Request,
    init?: RequestInit
  ) => Promise<Response>;
}): DredgeClient<inferRouteUnion<Api>> {
  const { prefixUrl, transformer, fetch } = options;

  // refactor this
  const jsonTransformer = transformer.json || defaultTransformer.json;
  const formDataTransformer =
    transformer.formData || defaultTransformer.formData;
  const searchParamsTransformer =
    transformer.searchParams || defaultTransformer.searchParams;

  const client = (async (input: string, options) => {
    const { data, ...rest } = options;

    // validate input
    // create URL with searchParams
    const url = new URL(input);

    // serialize based on contentType
    const serializedBody = jsonTransformer.serialize(data);

    let fetchResponse: Response;

    const response = new Promise((resolve, reject) => {
      fetch(url, {
        ...rest,
        body: serializedBody,
      })
        .then(async (res) => {
          fetchResponse = res;
          const { json, clone, ...rest } = res;

          resolve({
            ...rest,
            data: createResponseDataFunction(res, transformer),
            clone() {
              return this;
            },
          });
        })
        .catch((err) => {
          reject(err);
        });
    }) as ResponsePromise<any>;

    response.data = createResponseDataFunction(fetchResponse!, transformer);

    return response;
  }) as DredgeClient<inferRouteUnion<Api>>;

  const aliases = ["get", "post", "put", "patch", "head", "delete"] as const;

  for (const method of aliases) {
    client[method] = (path: string, options) =>
      client(path as any, { ...options, method }) as any;
  }

  return client;
}

function createResponseDataFunction(
  fetchResponse: Response,
  transformer: Partial<Transformer>
) {
  const jsonTransformer = transformer.json || defaultTransformer.json;
  const formDataTransformer =
    transformer.formData || defaultTransformer.formData;
  const searchParamsTransformer =
    transformer.searchParams || defaultTransformer.searchParams;

  const fn = async () => {
    const contentType = fetchResponse.headers.get("Content-Type");
    let data: any;

    if (contentType?.startsWith("application/json")) {
      data = jsonTransformer.deserialize(await fetchResponse.text());
    }
    if (contentType?.startsWith("multipart/form-data")) {
      data = formDataTransformer.deserialize(await fetchResponse.formData());
    }

    if (contentType?.startsWith("application/x-www-form-urlencoded")) {
      const searchParams = new URLSearchParams(await fetchResponse.text());
      data = searchParamsTransformer.deserialize(searchParams);
    }

    if (fetchResponse.ok) {
      return Promise.resolve(data);
    } else {
      return Promise.reject(data);
    }
  };

  return fn;
}
