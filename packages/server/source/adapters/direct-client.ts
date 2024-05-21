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

    return decorateResponsePromise(result);
  };

  const alias = ["get", "post", "put", "patch", "delete", "head"] as const;

  alias.forEach((method) => {
    client[method] = async (path: any, options?: DirectClientOptions) => {
      const {
        ctx = {},
        data = null,
        headers = {},
        searchParams = {},
      } = options || {};

      const responsePromise = api.resolveRouteWithoutTransforms(ctx, {
        path,
        data,
        method,
        headers: joinDuplicateHeaders(headers),
        searchParams,
      });

      decorateResponsePromise(responsePromise);
      return responsePromise;
    };
  });

  return client as DirectClient<inferApiRoutes<Api>>;
}

function decorateResponsePromise(responsePromise: any) {
  responsePromise.data = async () => {
    return (await responsePromise).data;
  };
}
