import { Route } from "./dredge-route";
import { HTTPMethod } from "./http";

export type inferRouteMethod<R> = R extends Route<
  any,
  any,
  any,
  infer Method extends HTTPMethod,
  any,
  any,
  any,
  any,
  any
>
  ? Method
  : never;
