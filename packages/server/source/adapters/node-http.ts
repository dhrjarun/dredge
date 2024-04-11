import type * as http from "http";
import { DredgeApi } from "../_api";
import { Transformer, AnyRoute, trimSlashes } from "@dredge/common";
import busboy from "busboy";
import { FormData, File } from "formdata-node";
import { FormDataEncoder } from "form-data-encoder";
import { Readable } from "stream";

export function createNodeHttpRequestHandler<
  Context extends object = {}
>(options: {
  api: DredgeApi<Context, AnyRoute[]>;
  transformer: Partial<Transformer>;
  ctx: Context;
  prefixUrl: URL;
}) {
  const { transformer, api, ctx, prefixUrl } = options;

  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const url = new URL(req.url!);
    const initialPathname = trimSlashes(prefixUrl.pathname);
    if (url.pathname.startsWith(initialPathname)) {
      throw "Invalid url";
    }
    const path = trimSlashes(url.pathname).slice(initialPathname.length);
    const body = getRequestBody(req, { transformer });
    const data = body.data();

    const headers = req.headers;

    const result = await api.resolveRoute({
      ctx,
      method: req.method,
      searchParams: url.searchParams,
      path,
      data,
      headers,
    });

    // check if status is ok
    const dataOrError = result.data;
    res.writeHead(result.status, result.statusText, result.headers);
    writeDataIntoResponse(res, dataOrError, {
      transformer,
    });
    res.end();
  };
}

export function writeDataIntoResponse(
  res: http.ServerResponse,
  data: any,
  options: {
    callback?: ((error: Error | null | undefined) => void) | undefined;
    transformer?: Partial<Transformer>;
  }
) {
  const { transformer: _transformer = {}, callback } = options;
  const transformer = populateTransformer(options.transformer);

  const contentType = res.getHeader("Content-Type") as string;

  if (contentType?.startsWith("application/json")) {
    const json = transformer.json.serialize(data);
    return res.write(json, callback);
  }
  if (contentType?.startsWith("multipart/form-data")) {
    const form = transformer.formData.serialize(data);
    const encoder = new FormDataEncoder(form);
    return res.write(Readable.from(encoder.encode()), callback);
  }

  if (contentType?.startsWith("application/x-www-form-urlencoded")) {
    const searchParams = new URLSearchParams(data);
    const form = transformer.searchParams.serialize(searchParams);
    return res.write(form.toString(), callback);
  }

  return res.write(data, callback);
}

export function getRequestBody(
  req: http.IncomingMessage,
  options: { transformer?: Partial<Transformer> }
) {
  const transformer = populateTransformer(options.transformer);

  function buffer() {
    return new Promise<Buffer>((resolve, reject) => {
      const bodyChunks: any[] = [];
      let body: Buffer;
      req
        .on("error", (err) => {
          reject(err);
        })
        .on("data", (chunk) => {
          bodyChunks.push(chunk);
        })
        .on("end", () => {
          body = Buffer.concat(bodyChunks);
          resolve(body);
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

    return new Promise<FormData>((resolve, reject) => {
      const formData = new FormData();
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
              new File(chunks, info.filename, {
                type: info.mimeType,
              })
            );
          });
      });

      bb.on("close", () => {
        resolve(formData);
      });

      bb.on("error", (err) => reject(err));

      req.pipe(bb);
    });
  }

  function data() {
    return new Promise<unknown>(async (resolve, reject) => {
      const contentType = req.headers["content-type"];

      try {
        let data: unknown;

        if (contentType?.startsWith("application/json")) {
          data = transformer.json.deserialize(await text());
        }

        if (contentType?.startsWith("multipart/form-data")) {
          data = transformer.formData.deserialize(await formData());
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

function populateTransformer(
  transformer: Partial<Transformer> = {}
): Transformer {
  const _transformer: Transformer = {
    json: {
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    },
    formData: {
      serialize: (object) => {
        const formData = new FormData();
        Object.entries(object).forEach(([key, value]) => {
          if (typeof value === "string" || value instanceof Blob) {
            formData.append(key, value);
          } else {
            throw "serialization failed";
          }
        });

        return formData;
      },
      deserialize: (object) => {
        return Object.fromEntries(object.entries());
      },
    },
    searchParams: {
      serialize: (object) => new URLSearchParams(object),
      deserialize: (object) => Object.fromEntries(object.entries()),
    },
  };

  Object.entries(transformer).forEach(([key, value]) => {
    if (value) {
      (_transformer as any)[key] = value;
    }
  });

  return _transformer;
}
