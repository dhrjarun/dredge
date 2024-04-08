import {
  ServerRequest,
  ServerResponse,
  Transformer,
  defaultTransformer,
} from "@dredge/common";
import * as http from "http";
import { Socket } from "net";
import busboy from "busboy";

export class DredgeServerRequest
  extends http.IncomingMessage
  implements ServerRequest
{
  transformer: Transformer = defaultTransformer;

  constructor(
    socket: Socket,
    options: {
      transformer: Partial<Transformer>;
    }
  ) {
    super(socket);

    const { transformer } = options;

    Object.entries(transformer).forEach(([key, value]) => {
      if (value) {
        (this.transformer as any)[key] = value;
      }
    });
  }

  buffer() {
    return new Promise<Buffer>((resolve, reject) => {
      const bodyChunks: any[] = [];
      let body: Buffer;
      this.on("error", (err) => {
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

  text() {
    return new Promise<string>((resolve, reject) => {
      this.buffer()
        .then((buffer) => {
          resolve(buffer.toString());
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  formData() {
    const bb = busboy({ headers: this.headers });

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
              new Blob(chunks, {
                type: info.mimeType,
              })
            );
          });
      });

      bb.on("close", () => {
        resolve(formData);
      });

      bb.on("error", (err) => reject(err));

      this.pipe(bb);
    });
  }

  data() {
    return new Promise<unknown>(async (resolve, reject) => {
      const contentType = this.headers["content-type"];

      try {
        let data: unknown;

        if (contentType?.startsWith("application/json")) {
          data = this.transformer.json.deserialize(await this.text());
        }

        if (contentType?.startsWith("multipart/form-data")) {
          data = this.transformer.formData.deserialize(await this.formData());
        }

        if (contentType?.startsWith("application/x-www-form-urlencoded")) {
          const searchParams = new URLSearchParams(await this.text());
          data = this.transformer.searchParams.deserialize(searchParams);
        }

        resolve(data);
      } catch (err) {
        reject(err);
      }
    });
  }
}

export class DredgeServerResponse
  extends http.ServerResponse
  implements ServerResponse
{
  transformer: Transformer = defaultTransformer;

  constructor(
    req: http.IncomingMessage,
    options: {
      transformer: Partial<Transformer>;
    }
  ) {
    super(req);
    const { transformer } = options;

    Object.entries(transformer).forEach(([key, value]) => {
      if (value) {
        (this.transformer as any)[key] = value;
      }
    });
  }

  writeData(
    data: any,
    callback?: ((error: Error | null | undefined) => void) | undefined
  ) {
    const contentType = this.getHeader("Content-Type") as string;

    let body: string | FormData | URLSearchParams = "";

    if (contentType?.startsWith("application/json")) {
      body = this.transformer.json.serialize(data);
    }
    if (contentType?.startsWith("multipart/form-data")) {
      body = this.transformer.formData.serialize(data);
    }

    if (contentType?.startsWith("application/x-www-form-urlencoded")) {
      const searchParams = new URLSearchParams(data);
      body = this.transformer.searchParams.serialize(searchParams);
    }

    return this.write(body.toString(), callback);
  }
}
