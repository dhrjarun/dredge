import { AnyRoute } from "@dredge/common";
import { IsNever } from "ts-essentials";
import { dredgeRouter } from "../router";
import { inferRouteArrayContext } from "../types/dredge-client-option";
import {
  DefaultDirectClientOptions,
  DirectClient,
  DirectClientOptions,
} from "../types/dredge-direct-client";

import { joinDuplicateHeaders } from "../utils/headers";
import { mergeHeaders } from "../utils/headers";
import { mergeDeep } from "../utils/merge";

export function directClient<const Routes extends AnyRoute[]>(
  routes: Routes,
): IsNever<inferRouteArrayContext<Routes>> extends false
  ? DirectClient<Routes>
  : "Routes's Context do not match" {
  return createDirectClient(routes, {}) as any;
}

function createDirectClient(
  routes: AnyRoute[],
  options: DefaultDirectClientOptions,
): DirectClient<any> {
  const router = dredgeRouter(routes);

  const client: any = (path: string, options?: DirectClientOptions) => {
    const {
      ctx = {},
      data = null,
      method = "get",
      headers = {},
      searchParams = {},
    } = options || {};

    const result = router.call(path, {
      ctx: mergeDeep(options?.ctx || {}, ctx),
      data,
      method,
      headers: mergeHeaders(options?.headers || {}, headers),
      searchParams,
    });

    const responsePromise = new Promise((resolve, reject) => {
      result
        .then((value) => {
          const response = {
            ...value,
            data() {
              return Promise.resolve(value.data);
            },
          };

          resolve(response);
        })
        .catch((err) => {
          reject(err);
        });
    });

    decorateResponsePromise(responsePromise);
    return responsePromise;
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

      const result = router.call(path, {
        ctx: mergeDeep(options?.ctx || {}, ctx),
        data,
        method,
        headers: joinDuplicateHeaders(headers),
        searchParams,
      });

      const responsePromise = new Promise((resolve, reject) => {
        result
          .then((value) => {
            const response = {
              ...value,
              data() {
                return Promise.resolve(value.data);
              },
            };

            resolve(response);
          })
          .catch((err) => {
            reject(err);
          });
      });

      decorateResponsePromise(responsePromise);
      return responsePromise;
    };
  });

  client.extend = (extendOptions: DefaultDirectClientOptions) => {
    return createDirectClient(routes, {
      ctx: extendOptions.ctx || options.ctx,
      headers: mergeHeaders(options.headers || {}, extendOptions.headers || {}),
      prefixUrl: extendOptions.prefixUrl ?? options.prefixUrl,
      dataType: extendOptions.dataType ?? options.dataType,
      responseDataType: extendOptions.dataType ?? options.dataType,
      throwHttpErrors:
        extendOptions.throwHttpErrors ?? extendOptions.throwHttpErrors,
      dataTypes: {
        ...options.dataTypes,
        ...extendOptions.dataTypes,
      },
    });
  };

  return client;
}

function decorateResponsePromise(responsePromise: any) {
  responsePromise.data = async () => {
    return (await responsePromise).data;
  };
}
