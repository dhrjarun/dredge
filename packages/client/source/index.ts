import { DredgeClient, FetchOptions, inferRoutes } from "@dredge/common";
import { dredgeFetch } from "./dredge-fetch";

export function createFetchClient<DredgeApi>(
  defaultOptions: FetchDefaultOptions
): DredgeClient<inferRoutes<DredgeApi>> {
  const fetch = ((path, options) => {
    return dredgeFetch(path, mergeFetchOptions(options, defaultOptions));
  }) as DredgeClient<inferRoutes<DredgeApi>>;

  const alias = ["get", "post", "put", "patch", "delete", "head"] as const;

  alias.forEach((method) => {
    fetch[method] = (path: any, options: any) => {
      return dredgeFetch(
        path,
        mergeFetchOptions(
          {
            ...options,
            method,
          },
          defaultOptions
        )
      ) as any;
    };
  });

  return fetch;
}

type FetchDefaultOptions = Pick<
  FetchOptions,
  "fetch" | "headers" | "transformer"
> & {
  prefixUrl: string | URL;
};

function mergeFetchOptions(
  options: any,
  defaultOptions: FetchDefaultOptions
): FetchOptions {
  const transformer = defaultOptions.transformer || {};
  Object.entries(options.transformer || {}).forEach(([key, value]) => {
    if (value) {
      (transformer as any)[key] = value;
    }
  });

  const headers = {
    ...defaultOptions.headers,
    ...options.headers,
  };

  const { data, method, path, searchParams } = options;
  return {
    headers,
    transformer,
    method,
    path,
    data,
    searchParams,
    fetch: options.fetch || defaultOptions.fetch,
    prefixUrl: options.prefixUrl || defaultOptions.prefixUrl,
  };
}
