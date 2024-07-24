import {
  DirectClientResponse,
  NormalizedDirectClientOptions,
} from "./types/dredge-direct-client";

// eslint-lint-disable-next-line @typescript-eslint/naming-convention
export class HTTPError extends Error {
  public response: DirectClientResponse;
  // public request: Request;
  public options: NormalizedDirectClientOptions;

  constructor(
    response: DirectClientResponse,
    // request: Request,
    options: NormalizedDirectClientOptions,
  ) {
    const code =
      response.status || response.status === 0 ? response.status : "";
    const title = response.statusText || "";
    const status = `${code} ${title}`.trim();
    const reason = status ? `status code ${status}` : "an unknown error";

    super(`Request failed with ${reason}: ${options.method} ${options.path}`);

    this.name = "HTTPError";
    this.response = response;
    // this.request = request;
    this.options = options;
  }
}
