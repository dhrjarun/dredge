import type { RawResponse } from "dredge-types";

export class DredgeResponse {
  #response: RawResponse;

  constructor(response: RawResponse) {
    this.#response = response;
  }

  get status() {
    return this.#response.status;
  }
  get statusText() {
    return this.#response.statusText;
  }
  get dataType() {
    return this.#response.dataType;
  }
  get data() {
    return this.#response.data;
  }
  get headers() {
    return this.#response.headers;
  }
}
