import type {
  DredgeResponsePromise,
  inferDredgeResponsePromise,
} from "dredge-types";

export interface FetchResponse<T = any> extends globalThis.Response {
  data(): Promise<T>;
}

export type FetchResponsePromise<
  DataTypes = never,
  Data = any,
> = DredgeResponsePromise<DataTypes, Data, FetchResponse>;

export type inferFetchResponsePromise<R> = inferDredgeResponsePromise<
  R,
  FetchResponse
>;
