import { headerFn } from "./request";

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
  header(headerName?: string) {
    return headerFn(this.#response.headers)(headerName) as any;
  }
}

export interface RawResponse {
  status?: number;
  statusText?: string;
  dataType?: string;
  data?: any;
  headers: Record<string, string>;
}
