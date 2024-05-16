import {
  AnyDredgeApi,
  DirectClientOptions,
  inferApiContext,
  inferApiRoutes,
} from "@dredge/common";
import { DirectClient } from "@dredge/common";
import { joinDuplicateHeaders } from "../utils/headers";
import { mergeDeep, mergeHeaders } from "../utils/merge";

export function createDirectClient<const Api extends AnyDredgeApi>(
  api: Api,
  defaultOptions?: {
    headers?: Record<string, string>;
    ctx?: inferApiContext<Api>;
  },
): DirectClient<inferApiRoutes<Api>> {
  const client: any = (path: string, options?: DirectClientOptions) => {
    const {
      ctx = {},
      data = null,
      method = "get",
      headers = {},
      searchParams = {},
    } = options || {};

    const result: any = api.resolveRouteWithoutTransforms(
      mergeDeep(defaultOptions?.ctx || {}, ctx),
      {
        path,
        data,
        method,
        headers: mergeHeaders(
          defaultOptions?.headers || {},
          joinDuplicateHeaders(headers),
        ),
        searchParams,
      },
    );

    return decorateResponse(result);
  };

  const alias = ["get", "post", "put", "patch", "delete", "head"] as const;

  alias.forEach((method) => {
    client[method] = (path: any, options?: DirectClientOptions) => {
      const {
        ctx = {},
        data = null,
        headers = {},
        searchParams = {},
      } = options || {};

      const result = api.resolveRouteWithoutTransforms(ctx, {
        path,
        data,
        method,
        headers: joinDuplicateHeaders(headers),
        searchParams,
      });

      return decorateResponse(result);
    };
  });

  return client as DirectClient<inferApiRoutes<Api>>;
}

function decorateResponse(res: any) {
  res.data = async () => {
    const result = await res;
    return result.data;
  };

  return res;
}
