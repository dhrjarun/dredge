import { DredgeRouter } from "../../source";
import { DredgeClient } from "../../source/client";

export const createClient = <R>(defaultOptions?: object) => {
  function client(path: string, options: object) {
    return ["root", path, options, defaultOptions];
  }

  const methods = ["get", "post"];

  methods.forEach((m) => {
    (client as any)[m] = (path: string, options: null) => {
      return [m, path, options, defaultOptions];
    };
  });

  return client as any as DredgeClient<R, {}, {}, {}>;
};
