import { inferApiRoutes, mergeDeep } from "@dredge/common";
import { dredgeFetch } from "./dredge-fetch";
import { DredgeClient } from "./types/client";
import { DefaultFetchOptions, FetchOptions } from "./types/options";

function createFetchClient<DredgeApi>(
  defaultOptions: DefaultFetchOptions,
): DredgeClient<inferApiRoutes<DredgeApi>> {
  const fetch = ((path, options) => {
    return dredgeFetch(path, mergeFetchOptions(options, defaultOptions)) as any;
  }) as DredgeClient<inferApiRoutes<DredgeApi>>;

  const alias = ["get", "post", "put", "patch", "delete", "head"] as const;

  alias.forEach((method) => {
    fetch[method] = (path: any, options?: any) => {
      return dredgeFetch(
        path,
        mergeFetchOptions(
          {
            ...options,
            method,
          },
          defaultOptions,
        ),
      ) as any;
    };
  });

  fetch.extends = (defaultOptions: DefaultFetchOptions) => {
    return createFetchClient(defaultOptions) as any;
  };

  return fetch;
}

export function dFetch<DredgeApi>(
  prefixUrl: string | URL,
): DredgeClient<inferApiRoutes<DredgeApi>> {
  return createFetchClient({ prefixUrl }) as any;
}

function mergeFetchOptions(
  options: any,
  defaultOptions: DefaultFetchOptions,
): FetchOptions {
  const newOptions = { ...options };

  Object.entries(newOptions).forEach(([key, value]) => {
    if (typeof newOptions[key] === "undefined") {
      newOptions[key] = value;
    }
  });
  newOptions.headers = mergeHeaders(options.headers, defaultOptions.headers);
  newOptions.hooks = mergeDeep(options.hooks, defaultOptions.hooks || {});

  return newOptions;
}

export const mergeHeaders = (
  source1: HeadersInit = {},
  source2: HeadersInit = {},
) => {
  const result = new globalThis.Headers(source1 as RequestInit["headers"]);
  const isHeadersInstance = source2 instanceof globalThis.Headers;
  const source = new globalThis.Headers(source2 as RequestInit["headers"]);

  for (const [key, value] of source.entries()) {
    if ((isHeadersInstance && value === "undefined") || value === undefined) {
      result.delete(key);
    } else {
      result.set(key, value);
    }
  }

  return result;
};
