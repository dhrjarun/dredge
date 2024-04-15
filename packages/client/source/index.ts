import { DredgeClient, FetchOptions, inferRoutes } from "@dredge/common";
import { dredgeFetch } from "./dredge-fetch";

export function create<DredgeApi>(defaultOptions: FetchDefaultOptions) {
  const fetch = ((path, options) => {
    return dredgeFetch(path, populateFetchOptions(options, defaultOptions));
  }) as DredgeClient<inferRoutes<DredgeApi>>;

  const alias = ["get", "post", "put", "patch", "delete", "head"] as const;

  alias.forEach((method) => {
    fetch[method] = (path: any, options: any) => {
      return dredgeFetch(
        path,
        populateFetchOptions(options, defaultOptions)
      ) as any;
    };
  });
}

type FetchDefaultOptions = Pick<
  FetchOptions,
  "fetch" | "headers" | "transformer"
> & {
  prefixUrl: string | URL;
};

function populateFetchOptions(
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
