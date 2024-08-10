import http from "http";
import { AnyRoute } from "dredge-route";
import { createNodeHttpRequestHandler } from "./node-http";

export interface CreateHTTPServerOptions<Context extends object> {
  routes: AnyRoute[];
  ctx: Context;
  prefixUrl: string;
}

export function createHTTPServer<Context extends object = {}>(
  options: CreateHTTPServerOptions<Context>,
) {
  const handler = createNodeHttpRequestHandler(options);
  return http.createServer(handler);
}
