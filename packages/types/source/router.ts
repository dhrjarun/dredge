import { AnyRoute } from "./route";

export interface DredgeRouter<Routes = []> {
  find(method: string, path: string[]): AnyRoute | null;
}

export type inferRouterRoutes<T> = T extends DredgeRouter<infer R> ? R : never;

export type OverwriteRoutes<
  T extends (AnyRoute | DredgeRouter)[],
  U extends AnyRoute[] = [],
> = T extends [infer First, ...infer Rest extends (AnyRoute | DredgeRouter)[]]
  ? First extends DredgeRouter<infer Rs extends AnyRoute[]>
    ? OverwriteRoutes<Rest, [...U, ...Rs]>
    : OverwriteRoutes<Rest, [...U, First extends AnyRoute ? First : never]>
  : U;
