import { AnyRoute, DredgeApi, DredgeClient, Transformer } from "@dredge/common";

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

export function createDredgeHttpClient<Api extends DredgeApi<any>>(options: {
  prefixUrl: URL | string;
  transformer: Partial<Transformer>;
  fetch: (
    input: string | URL | globalThis.Request,
    init?: RequestInit
  ) => Promise<Response>;
}): DredgeClient<Api> {
  const { prefixUrl, transformer, fetch } = options;

  const jsonTransformer = transformer.json || defaultTransformer.json;

  const client = ((input: string, options) => {
    const { body, ...rest } = options;
    // validate input
    const url = new URL(input);

    const serializedBody = jsonTransformer.serialize(body);

    const response = fetch(url, {
      ...rest,
      body: serializedBody,
    });
  }) as DredgeClient<Api>;

  const aliases = ["get", "post", "put", "patch", "head", "delete"] as const;

  for (const method of aliases) {
    client[method] = (path: string, options) =>
      client(path as any, { ...options, method }) as any;
  }

  return client;
}

const defaultTransformer: Transformer = {
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
