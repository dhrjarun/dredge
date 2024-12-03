import { Context, RawContext } from "./context";
import { D } from "./d";

export function composeMiddlewares(middlewares: any) {
  if (!Array.isArray(middlewares))
    throw new TypeError("Middleware stack must be an array!");
  for (const fn of middlewares) {
    if (typeof fn !== "function")
      throw new TypeError("Middleware must be composed of functions!");
  }

  return async (context: RawContext, next: any) => {
    // last called middleware #
    let index = -1;
    return dispatch(0);

    function dispatch(i: number): Promise<any> {
      if (i <= index)
        return Promise.reject(new Error("next() called multiple times"));
      index = i;
      let fn = middlewares[i];
      if (i === middlewares.length) fn = next;
      if (!fn) return Promise.resolve();

      try {
        const d = new D(context, dispatch.bind(null, index + 1));
        const c = new Context(context);
        return Promise.resolve(fn(d, c));
      } catch (err) {
        return Promise.reject(err);
      }
    }
  };
}
