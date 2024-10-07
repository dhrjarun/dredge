import { AnyRoute } from "../../source/route/dredge-route";
import { DredgeRouter, OverwriteRoutes } from "../../source/router";

export function dredgeRouter<const T extends (AnyRoute | DredgeRouter)[]>(
  routes: T,
): DredgeRouter<OverwriteRoutes<T>> {
  const router = null;

  return router as any;
}
