import type * as http from "http";
import {
  AnyRoute,
  DredgeApi,
  Transformer,
  populateTransformer,
  trimSlashes,
} from "@dredge/common";
import busboy from "busboy";
import { FormDataEncoder } from "form-data-encoder";
import parseUrl from "parseurl";

export interface CreateNodeHttpRequestHandlerOptions<Context extends object> {
  api: DredgeApi<Context, AnyRoute[]>;
  transformer?: Partial<Transformer>;
  ctx: Context;
  prefixUrl: URL | string;
}

export function createNodeHttpRequestHandler<Context extends object = {}>(
  options: CreateNodeHttpRequestHandlerOptions<Context>,
) {
  const { api, ctx } = options;
  const transformer = populateTransformer(options.transformer);

  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const url = parseUrl(req);
    const prefixUrl =
      options.prefixUrl instanceof URL
        ? options.prefixUrl
        : new URL(options.prefixUrl);
    const initialPathname = trimSlashes(prefixUrl.pathname);
    if (!url) {
      throw "invalid url";
    }
    const urlPathname = url.pathname ?? "/";
    if (!urlPathname.startsWith(initialPathname)) {
      throw "Invalid url";
    }
    const path = trimSlashes(urlPathname).slice(initialPathname.length);
    const body = getRequestBody(req, { transformer });
    const data = await body.data();
    const searchParams = transformer.searchParams.deserialize(
      new URLSearchParams(url.search ?? ""),
    );
    const headers = req.headers;

    const result = await api.resolveRoute(path, {
      ctx,
      method: req.method,
      headers,
      data,
      searchParams,
    });

    let dataOrError: any;
    try {
      dataOrError = await result.data();
    } catch (err) {
      dataOrError = err;
    }

    res.statusCode = result.status;
    res.statusMessage = result.statusText;
    Object.entries(result.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    if (dataOrError) {
      await writeDataIntoResponse(res, dataOrError, {
        transformer,
      });
    }
    res.end();
  };
}

export function getRequestBody(
  req: http.IncomingMessage,
  options: { transformer?: Partial<Transformer> },
) {
  const transformer = populateTransformer(options.transformer);
  let buf: Buffer | null = null;

  function buffer() {
    if (buf) return Promise.resolve(buf);

    return new Promise<Buffer>((resolve, reject) => {
      const bodyChunks: any[] = [];
      req
        .on("error", (err) => {
          reject(err);
        })
        .on("data", (chunk) => {
          bodyChunks.push(chunk);
        })
        .on("end", () => {
          buf = Buffer.concat(bodyChunks);
          resolve(buf);
        });
    });
  }

  function text() {
    return new Promise<string>((resolve, reject) => {
      buffer()
        .then((buffer) => {
          resolve(buffer.toString());
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  function formData() {
    const bb = busboy({ headers: req.headers });

    return new Promise<FormData>(async (resolve, reject) => {
      const formData = new FormData();

      bb.once("close", () => {
        resolve(formData);
      });

      bb.once("error", (err) => reject(err));

      bb.on("field", (name, value) => {
        formData.append(name, value);
      });

      bb.on("file", (name, stream, info) => {
        const chunks: any[] = [];
        stream
          .on("data", (chunk) => {
            chunks.push(chunk);
          })
          .on("error", (err) => {
            reject(err);
          })
          .on("close", () => {
            formData.append(
              name,
              info.filename !== "blob"
                ? new File(chunks, info.filename, {
                    type: info.mimeType,
                  })
                : new Blob(chunks, {
                    type: info.mimeType,
                  }),
            );
          });
      });

      bb.end(await buffer());
    });
  }

  function data() {
    return new Promise<unknown>(async (resolve, reject) => {
      const contentType = req.headers["content-type"];

      if ((await buffer()).length === 0) {
        resolve(null);
      }

      try {
        let data: unknown;

        if (contentType?.startsWith("application/json")) {
          data = transformer.json.deserialize(await text());
        }

        if (contentType?.startsWith("multipart/form-data")) {
          const fm = await formData();
          data = transformer.formData.deserialize(fm);
        }

        if (contentType?.startsWith("application/x-www-form-urlencoded")) {
          const searchParams = new URLSearchParams(await text());
          data = transformer.searchParams.deserialize(searchParams);
        }

        resolve(data);
      } catch (err) {
        reject(err);
      }
    });
  }

  return {
    buffer,
    text,
    formData,
    data,
  };
}

export async function writeDataIntoResponse(
  res: http.ServerResponse,
  data: any,
  options: {
    callback?: ((error: Error | null | undefined) => void) | undefined;
    transformer?: Partial<Transformer>;
  },
) {
  const { transformer: _transformer = {}, callback } = options;
  const transformer = populateTransformer(options.transformer);

  const contentType = res.getHeader("content-Type") as string;

  if (contentType?.startsWith("application/json")) {
    const json = transformer.json.serialize(data);
    return res.write(json, callback);
  }
  if (contentType?.startsWith("multipart/form-data")) {
    const form = transformer.formData.serialize(data);
    const encoder = new FormDataEncoder(form);
    const encoderHeaders = encoder.headers as any;

    for (const h in encoder.headers) {
      res.setHeader(h, encoderHeaders[h]);
    }

    for await (const chunk of encoder.encode()) {
      res.write(chunk, callback);
    }
    return true;
  }

  if (contentType?.startsWith("application/x-www-form-urlencoded")) {
    const searchParams = new URLSearchParams(data);
    const form = transformer.searchParams.serialize(searchParams);
    return res.write(form.toString(), callback);
  }

  if (
    typeof data === "string"
    // typeof data === "string" ||
    // data instanceof Buffer ||
    // data instanceof Uint8Array
  ) {
    return res.write(data, callback);
  }

  throw "Invalid data or no ContentType provided";
}
