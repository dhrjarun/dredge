import { z } from "zod";
import {
  Parser,
  ParserWithoutInput,
  getParseFn,
  inferParser,
  inferParserType,
} from "./parser";
import { Simplify } from "./types";

type IntersectIfDefined<TType, TWith> = TType extends UnsetMarker
  ? TWith
  : TWith extends UnsetMarker
  ? TType
  : Simplify<TType & TWith>;

/** @internal */
export const unsetMarker = Symbol("unsetMarker");
type UnsetMarker = typeof unsetMarker;
type DefaultValue<TValue, TFallback> = TValue extends UnsetMarker
  ? TFallback
  : TValue;

interface Procedure {
  slash: (
    name: string,
    validation: boolean | ((value: string) => boolean)
  ) => Procedure;

  queries: () => {};
  query: () => {};

  get: () => {};
  post: () => {};
  put: () => {};
  delete: () => {};
  patch: () => {};

  use: () => Procedure;
  resolve: (payload: {
    slug: Record<string, string>;
    body: unknown;
    headers: Record<string, string>;
    queries: unknown;
    ctx: unknown;
  }) => {};
}

class RouteBuilder {
  _paths: {
    name: string;
    isDynamic: boolean;
    parser: Parser;
  }[];
  _queries: Record<
    string,
    {
      parser: Parser;
    }
  >;
  body: {
    parser: Parser;
  };
  method: string;

  middlewares: Function[];
  resolver: Function;

  path(name: string, schema?: Parser) {
    this._paths.push({
      name,
      isDynamic: !!schema,
      parser: getParseFn(schema || (() => {})),
    });
  }

  queries(schema: Record<string, Parser>) {
    Object.entries(schema).forEach(([key, value]) => {
      this._queries[key] = {
        parser: getParseFn(value),
      };
    });
  }

  get(parser: Parser) {
    this.method = "get";
    this.body = {
      parser: getParseFn(parser),
    };
  }

  post(parser: Parser) {
    this.method = "post";
    this.body = {
      parser: getParseFn(parser),
    };
  }

  use(fn: Function) {
    this.middlewares.push(fn);
  }
}

interface Path<N extends string, T> {
  name: N;
  isDynamic: boolean;
  parser: T;
}

type RouteBuilderDef = {
  method: "get" | "post" | "put" | "delete";
  pathname: string[];
  slug: Record<string, Parser>;
  path: { name: string; parser: Parser }[];
  searchParams: Record<string, Parser>;

  iBody: Parser[];
  oBody: Parser[];

  middlewares: AnyMiddlewareFunctison[];
  resolver?: ProcedureBuilderResolver;
};

type StaticPath<N> = {
  _name: N;
  _isDynamic: false;
};
type DynamicPath<N, T> = {
  _name: N;
  _isDynamic: true;
  _value: T;
};

// extends Array<string | [string, unknown]>
interface Route<Context, IBody, Queries, Paths extends Array<unknown>> {
  _def: RouteBuilderDef;

  path<N extends string, P>(
    name: N,
    parser?: P
  ): Route<
    Context,
    IBody,
    Queries,
    Paths extends Array<unknown>
      ? [...Paths, P extends Parser ? [N, P] : N]
      : "Path must be array"
  >;

  paths<const T extends (string | [string, Parser])[]>(
    ...paths: T
  ): Route<Context, IBody, Queries, T>;

  queries<const T extends { [key: string]: Parser }>(
    queries: T
  ): Route<Context, IBody, T, Paths>;

  post<P extends Parser>(parser: P): Route<Context, P, Queries, Paths>;

  resolve(
    cb: (args: {
      ctx: Context;
      body: inferParserType<IBody>;
      slug: {
        [key in Exclude<Paths[number], string> as key extends [string, Parser]
          ? key[0]
          : never]: key extends [string, Parser]
          ? inferParserType<key[1]>
          : never;
      };
      queries: {};
    }) => void
  ): void;
}

// function createNewBuilder(
//   def1: AnyProcedureBuilderDef,
//   def2: Partial<AnyProcedureBuilderDef>
// ): AnyProcedureBuilder {
//   const { middlewares = [], inputs, meta, ...rest } = def2;

//   // TODO: maybe have a fn here to warn about calls
//   return createBuilder({
//     ...mergeWithoutOverrides(def1, rest),
//     middlewares: [...def1.middlewares, ...middlewares],
//   });
// }

// initDef: Partial<AnyProcedureBuilderDef> = {}
function createBuilder() {
  return {
    path: (path: string, parser?: Parser) => {},
  } as Route<{}, unknown, {}, []>;
}

let rb = createBuilder() as Route<{}, unknown, {}, []>;
let xb = rb.path("user");
let xbb = xb.path("username", z.enum(["dhrjarun", "vi"]));
let xxxb = rb.paths("user", ["username", z.enum(["dhrjarun", "vi"])], "c", [
  "age",
  z.number(),
]);
let xxxxb = xxxb.queries({
  name: z.string(),
  age: z.number(),
  gender: z.enum(["male", "female"]),
});
xxxxb.resolve(({ slug }) => {});

type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N
  ? R
  : _TupleOf<T, N, [T, ...R]>;

export type Tuple<T, N extends number> = N extends N
  ? number extends N
    ? T[]
    : _TupleOf<T, N, []>
  : never;
