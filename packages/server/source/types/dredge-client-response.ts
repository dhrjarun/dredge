import { AnyRouteOptions, Parser, Route, inferParserType } from "@dredge/route";

export interface DredgeClientResponse<T = any> {
  headers: Record<string, string>;
  status?: number;
  statusText?: string;
  data(): Promise<T>;
  dataType?: string;
}

export type DredgeResponsePromise<DataTypes, Data = any> = Promise<
  DredgeClientResponse<Data>
> & {
  [key in DataTypes extends string ? DataTypes : never]: () => Promise<Data>;
} & { data: () => Promise<Data> };

export type inferDredgeResponsePromise<R> = R extends Route<
  infer Options extends AnyRouteOptions,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  infer OBody,
  any
>
  ? DredgeResponsePromise<
      keyof Options["dataTypes"],
      OBody extends Parser ? inferParserType<OBody> : unknown
    >
  : never;
