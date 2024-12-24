import { DredgeResponse } from "./response";
import { DredgeRequest } from "./request";
import { DataTypes } from "dredge-common";
import { DredgeRouteSchema } from "dredge-types";
import type { RawRequest, RawResponse } from "dredge-types";

export class Context {
  #raw: RawContext;
  #req: DredgeRequest;
  #res: DredgeResponse;

  constructor(options: RawContext) {
    this.#raw = options;
    this.#req = new DredgeRequest(this.#raw.request);
    this.#res = new DredgeResponse(this.#raw.response);
  }

  get error() {
    return this.#raw.error;
  }

  get req() {
    return this.#req;
  }

  get res() {
    return this.#res;
  }

  get state() {
    return this.#raw.state;
  }

  get schema() {
    return this.#raw.schema;
  }
}

export type RawContext = {
  error?: any;
  dataTypes: DataTypes;
  request: RawRequest;
  response: RawResponse;
  state: any;
  schema: DredgeRouteSchema;
};
