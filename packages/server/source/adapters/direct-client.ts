import {
  AnyRoute,
  DefaultDirectClientOptions,
  DirectClientOptions,
  inferModifiedInitialRouteContext,
} from "@dredge/common";
import { DirectClient } from "@dredge/common";
import { IsNever } from "ts-essentials";
import { dredgeRouter } from "../router";
import { joinDuplicateHeaders } from "../utils/headers";
import { mergeDeep, mergeHeaders } from "../utils/merge";

type inferRoutesContext<Routes, Context = {}> = Routes extends [
  infer First extends AnyRoute,
  ...infer Tail extends AnyRoute[],
]
  ? inferRoutesContext<Tail, Context & inferModifiedInitialRouteContext<First>>
  : Context;

export function directClient<const Routes extends AnyRoute[]>(
  routes: Routes,
): IsNever<inferRoutesContext<Routes>> extends false
  ? DirectClient<Routes>
  : "Routes's Context do not match" {
  return createDirectClient(routes, {}) as any;
}

function createDirectClient(
  routes: AnyRoute[],
  defaultOptions: DefaultDirectClientOptions,
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
      ctx: mergeDeep(defaultOptions?.ctx || {}, ctx),
      data,
      method,
      headers: mergeHeaders(defaultOptions?.headers || {}, headers),
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
        ctx: mergeDeep(defaultOptions?.ctx || {}, ctx),
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

  client.extend = (options: {
    headers?: Record<string, string>;
    ctx?: any;
  }) => {};

  return client;
}

function decorateResponsePromise(responsePromise: any) {
  responsePromise.data = async () => {
    return (await responsePromise).data;
  };
}
