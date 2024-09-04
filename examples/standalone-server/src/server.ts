import { createHTTPServer } from "dredge-adapters";
import { rootRouter } from "./router";

const server = createHTTPServer({
  router: rootRouter,
  prefixUrl: "/api/dredge",
});

server.addListener("error", (err: any) => {
  console.log("Something went wrong", err);
});

server.addListener("listening", () => {
  const port = (server.address() as any)?.port;

  console.log(`listening on port ${port}`);
});

server.listen(3000);
