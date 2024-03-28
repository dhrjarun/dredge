import type * as http from "http";
import { DredgeApi, executeRoute } from "../api";
import { AnyRoute } from "../route";

export interface DataTransformer {
  serialize(object: any): any;
  deserialize(object: any): any;
}

// TODO
// endpoint
export function createNodeHttpAdapter(options: {
  api: DredgeApi<AnyRoute>;
  bodyTransformer: DataTransformer;
  ctx: object;
}) {
  const { bodyTransformer, api, ctx } = options;
  const root = api._root;

  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const method = req.method || "get";
    const url = new URL(req.url || "");
    const path = url.pathname as "";
    const searchParams = url.searchParams;
    const headers = req.headers;
    const rawBody = getBody(req);
    const body = bodyTransformer.deserialize(rawBody);

    const result = await executeRoute(root, ctx, {
      method,
      path,
      searchParams,
      body,
      headers,
    });

    res.statusCode = result.status;
    res.statusMessage = result.statusText;
    for (const item in result.headers) {
      res.setHeader(item, result.headers[item]);
    }

    const responseBody = bodyTransformer.serialize(result.body);
    res.write(responseBody);
    res.end();
  };
}

function getBody(request) {
  return new Promise((resolve) => {
    const bodyChunks: any[] = [];
    let body;
    request
      .on("data", (chunk) => {
        bodyChunks.push(chunk);
      })
      .on("end", () => {
        body = Buffer.concat(bodyChunks).toString();
        resolve(body);
      });
  });
}
