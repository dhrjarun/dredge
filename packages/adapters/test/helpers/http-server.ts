import { Server } from "http";
import {
  CreateHTTPServerOptions,
  createHTTPServer,
} from "../../source/standalone";

export async function startServer(
  opts: CreateHTTPServerOptions<any>,
): Promise<Server> {
  let server: ReturnType<typeof createHTTPServer>;

  server = createHTTPServer({
    ...opts,
  });

  return new Promise((resolve, reject) => {
    server.addListener("error", (err) => {
      reject(err);
    });
    server.addListener("listening", () => {
      resolve(server);
    });
    server.listen();
  });
}
