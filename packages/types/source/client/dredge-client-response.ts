import { inferParserType } from "../parser";
import { AnyRouteOptions, Route } from "../route";
import { IsNever, Merge } from "../utils";

export interface DredgeClientResponse<T = any> {
  headers: Record<string, string>;
  status?: number;
  statusText?: string;
  data(): Promise<T>;
  dataType?: string;
}

export type DredgeResponsePromise<
  DataTypes,
  Data = any,
  Response = DredgeClientResponse,
> = Promise<
  Merge<
    Response,
    {
      data(): Promise<Data>;
    }
  >
> & {
  [key in DataTypes extends string ? DataTypes : never]: () => Promise<Data>;
} & {
  data: () => Promise<Data>;
};

export type inferDredgeResponsePromise<
  R,
  Response = DredgeClientResponse,
> = R extends Route<
  infer Options extends AnyRouteOptions,
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
      IsNever<inferParserType<OBody>> extends true
        ? any
        : inferParserType<OBody>,
      Response
    >
  : never;
