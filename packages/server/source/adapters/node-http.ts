import type * as http from "http";
import { Transformer, AnyRoute, trimSlashes, DredgeApi } from "@dredge/common";
import busboy from "busboy";
import { FormData, File } from "formdata-node";
import { FormDataEncoder } from "form-data-encoder";
import { Readable } from "stream";
import parseUrl from "parseurl";

export interface CreateNodeHttpRequestHandlerOptions<Context extends object> {
  api: DredgeApi<Context, AnyRoute[]>;
  transformer?: Partial<Transformer>;
  ctx: Context;
  prefixUrl: URL | string;
}

export function createNodeHttpRequestHandler<Context extends object = {}>(
  options: CreateNodeHttpRequestHandlerOptions<Context>
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
      new URLSearchParams(url.search ?? "")
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
    writeDataIntoResponse(res, dataOrError, {
      transformer,
    });
    res.end();
  };
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

  if (
    typeof data === "string" ||
    data instanceof Buffer ||
    data instanceof Uint8Array
  ) {
    return res.write(data, callback);
  }

  throw "Invalid data or no ContentType provided";
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
