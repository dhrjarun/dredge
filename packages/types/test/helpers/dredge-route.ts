import { Route } from "../../source/route/dredge-route";

export function dredgeRoute<Context extends Record<string, any> = {}>() {
  return createRouteBuilder() as any as Route<
    {
      initialContext: Context;
      modifiedInitialContext: Context;
      withDynamicPath: false;
      dataTypes: {};
    },
    Context,
    Context,
    string,
    [],
    {},
    {}
  >;
}

function createRouteBuilder() {
  const object = {};

  const proxy = new Proxy(object, {
    get(target, prop) {
      return () => {
        return proxy;
      };
    },
  });

  return proxy;
}
