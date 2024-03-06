import { z } from "zod";
import { Parser, ParserWithoutInput, getParseFn, inferParser } from "./parser";
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

class Rest {
  path: () => {};
  get: () => {};
  update: () => {};
}

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

interface Path {
  name: string;
  isDynamic: boolean;
  parser: Parser;
}

interface Route<
  Context extends object,
  IBody,
  Queries extends object,
  Paths extends Array<Path>,
  Slug extends object
> {
  _def: {};

  path<T extends string, P extends Parser | undefined>(
    name: T,
    parser?: P
  ): Route<
    Context,
    IBody,
    Queries,
    [
      ...Paths,
      { name: T; isDynamic: P extends Parser ? true : false; parser: Parser }
    ],
    P extends Parser ? Slug & Record<T, ParserWithoutInput<P>> : Slug
  >;

  paths<P extends (string | [string, Parser])[]>(
    ...ps: P
  ): Route<Context, IBody, Queries, Slug>;

  // paths<T extends Path[]>(): Route<Context, "added", Queries, [], P>;
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

function createNewBuilder(
  def1: AnyProcedureBuilderDef,
  def2: Partial<AnyProcedureBuilderDef>
): AnyProcedureBuilder {
  const { middlewares = [], inputs, meta, ...rest } = def2;

  // TODO: maybe have a fn here to warn about calls
  return createBuilder({
    ...mergeWithoutOverrides(def1, rest),
    middlewares: [...def1.middlewares, ...middlewares],
  });
}

function createBuilder(initDef: Partial<AnyProcedureBuilderDef> = {}) {
  return {
    path: (path: string, parser?: Parser) => {},
  } as Route<{}, unknown, {}, [], {}>;
}

let rb = routeBuilder() as Route<{}, unknown, {}, [], {}>;
let xb = rb.path("user", z.enum(["dhrj", "vi"]));
