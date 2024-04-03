import { AnyRoute } from "./route";

export interface DredgeApi<T> {
  _root: any;
}

export type inferRoutes<Api> = Api extends DredgeApi<
  infer Routes extends AnyRoute[]
>
  ? Routes
  : never;
export type inferRouteUnion<Api> = inferRoutes<Api>[number];
