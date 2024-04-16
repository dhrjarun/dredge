import { dredgeRoute } from "./route";
import { dredgeApi } from "./api";

export function dredge<Context extends object = {}>() {
  return {
    route: dredgeRoute<Context>(),
    api: dredgeApi<Context>(),
  };
}
