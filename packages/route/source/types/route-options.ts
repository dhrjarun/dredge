import { Route } from "./dredge-route";

export type inferModifiedInitialContext<Options> = Options extends {
  modifiedInitialContext: any;
}
  ? Options["modifiedInitialContext"]
  : never;

export type inferInitialContext<Options> = Options extends {
  initialContext: any;
}
  ? Options["initialContext"]
  : never;

export type inferInitialRouteContext<R> = R extends Route<
  infer Options extends {
    initialContext: any;
  },
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>
  ? Options["initialContext"]
  : never;

export type inferModifiedInitialRouteContext<R> = R extends Route<
  infer Options extends {
    modifiedInitialContext: any;
  },
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>
  ? Options["modifiedInitialContext"]
  : never;

export type inferRouteOptions<R> = R extends Route<
  infer Options,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>
  ? Options
  : never;

export type inferRouteDataTypes<R> = R extends Route<
  infer Options extends { dataTypes: any },
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any
>
  ? Options["dataTypes"]
  : never;
