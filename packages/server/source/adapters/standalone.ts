import http from "http";
import { AnyRoute, Transformer, DredgeApi } from "@dredge/common";
import { createNodeHttpRequestHandler } from "./node-http";

export interface CreateHTTPServerOptions<Context extends object> {
  api: DredgeApi<Context, AnyRoute[]>;
  transformer?: Partial<Transformer>;
  ctx: Context;
  prefixUrl: URL | string;
}

export function createHTTPServer<Context extends object = {}>(
  options: CreateHTTPServerOptions<Context>,
) {
  const handler = createNodeHttpRequestHandler(options);
  return http.createServer(handler);
}
