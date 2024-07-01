import {
  AnyRoute,
  DirectClientOptions,
  inferInitialRouteContext,
} from "@dredge/common";
import { DirectClient } from "@dredge/common";
import { DredgeRouter } from "../router";
import { joinDuplicateHeaders } from "../utils/headers";
import { mergeDeep, mergeHeaders } from "../utils/merge";

type inferRoutesContext<Routes, Context = {}> = Routes extends [
  infer First extends AnyRoute,
  ...infer Tail extends AnyRoute[],
]
  ? inferRoutesContext<Tail, Context & inferInitialRouteContext<First>>
  : Context;

export function createDirectClient<const Routes extends AnyRoute[]>(
  router: DredgeRouter,
  defaultOptions?: {
    headers?: Record<string, string>;
    ctx?: inferRoutesContext<Routes>;
  },
): DirectClient<Routes> {
  const client: any = (path: string, options?: DirectClientOptions) => {
    const {
      ctx = {},
      data = null,
      method = "get",
      headers = {},
      searchParams = {},
    } = options || {};

    const result: any = router.call(path, {
      ctx: mergeDeep(defaultOptions?.ctx || {}, ctx),
      data,
      method,
      headers: mergeHeaders(
        defaultOptions?.headers || {},
        joinDuplicateHeaders(headers),
      ),
      searchParams,
    });

    decorateResponsePromise(result);
    return result;
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

  return client as DirectClient<Routes>;
}

function decorateResponsePromise(responsePromise: any) {
  responsePromise.data = async () => {
    return (await responsePromise).data;
  };
}
