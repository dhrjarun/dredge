import http from "http";
import {
  CreateNodeHttpRequestHandlerOptions,
  createNodeHttpRequestHandler,
} from "./node-http";

export interface CreateHTTPServerOptions<Context extends object>
  extends CreateNodeHttpRequestHandlerOptions<Context> {}

export function createHTTPServer<Context extends object = {}>(
  options: CreateHTTPServerOptions<Context>,
) {
  const handler = createNodeHttpRequestHandler(options);
  return http.createServer(handler);
}
