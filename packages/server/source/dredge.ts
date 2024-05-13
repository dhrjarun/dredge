import { dredgeApi } from "./_api";
import { dredgeRoute } from "./route";

export function dredge<Context extends object = {}>() {
  return {
    route: dredgeRoute<Context>(),
    api: dredgeApi<Context>(),
  };
}
