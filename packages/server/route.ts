import { z } from "zod";
import {
  ParseFn,
  Parser,
  ParserWithoutInput,
  getParseFn,
  inferParserType,
} from "./parser";
import { Overwrite, Simplify } from "./types";

interface MiddlewareResult<C> {
  ctx: C;
}

export type inferSearchParamsType<SearchParams> = Simplify<{
  [key in keyof SearchParams]: inferParserType<SearchParams[key]>;
}>;

type MiddlewareFunction<
  Context,
  ContextOverride,
  Paths extends Array<unknown>,
  SearchParams,
  Method,
  IBody
> = {
  (opts: {
    ctx: Context;
    path: string;
    params: {
      [key in Exclude<Paths[number], string> as key extends [string, Parser]
        ? key[0]
        : never]: key extends [string, Parser]
        ? inferParserType<key[1]>
        : never;
    };
    searchParams: {
      [key in keyof SearchParams]: inferParserType<SearchParams[key]>;
    };
    method: Method;
    body: inferParserType<IBody>;

    next: {
      (): MiddlewareResult<Context>;
      <$ContextOverride>(opts: {
        ctx: $ContextOverride;
      }): MiddlewareResult<$ContextOverride>;
    };
  }): MiddlewareResult<ContextOverride>;
};

interface ResolverResult<OBody> {
  body: OBody;
  headers: Record<string, string>;
  status: number;
  statusText: string;
}

type ResolverFunction<
  Context,
  Paths extends Array<unknown>,
  SearchParams,
  Method,
  IBody,
  OBody
> = {
  (opts: {
    ctx: Context;
    path: string;
    params: {
      [key in Exclude<Paths[number], string> as key extends [string, Parser]
        ? key[0]
        : never]: key extends [string, Parser]
        ? inferParserType<key[1]>
        : never;
    };
    searchParams: {
      [key in keyof SearchParams]: inferParserType<SearchParams[key]>;
    };
    method: Method;
    body: inferParserType<IBody>;

    send: {
      (): MiddlewareResult<unknown>;
      <$OBody>(opts: {
        body?: $OBody;
        headers?: Record<string, string>;
        status?: number;
        statusText?: string;
      }): ResolverResult<$OBody>;
    };
  }): ResolverResult<OBody>;
};

type RouteBuilderDef = {
  method?: "get" | "post" | "put" | "delete";
  paths: (string | [string, ParseFn<any>])[];
  searchParams: Record<string, ParseFn<any>>;

  iBody?: ParseFn<any>;
  oBody?: ParseFn<any>;

  middlewares: MiddlewareFunction<any, any, any, any, any, any>[];
  resolver?: Function;
};

export interface Route<
  Context,
  Method,
  Paths extends Array<unknown>,
  SearchParams,
  IBody = never,
  OBody = never
> {
  _def: RouteBuilderDef;

  // path<N extends string, P>(
  //   name: N,
  //   parser?: P
  // ): Route<
  //   Context,
  //   IBody,
  //   Queries,
  //   Paths extends Array<unknown>
  //     ? [...Paths, P extends Parser ? [N, P] : N]
  //     : "Path must be array"
  // >;

  path<const T extends (string | [string, Parser])[]>(
    ...paths: T
  ): Route<Context, Method, T, SearchParams, IBody>;

  searchParam<const T extends { [key: string]: Parser }>(
    queries: T
  ): Route<Context, Method, Paths, T, IBody>;

  use<ContextOverride>(
    fn: MiddlewareFunction<
      Context,
      ContextOverride,
      Paths,
      SearchParams,
      Method,
      IBody
    >
  ): Route<
    Overwrite<Context, ContextOverride>,
    Method,
    Paths,
    SearchParams,
    IBody
  >;

  resolve<OBody>(
    fn: ResolverFunction<Context, Paths, SearchParams, Method, IBody, OBody>
  ): Route<
    Context,
    Method,
    Paths,
    SearchParams,
    IBody,
    ParserWithoutInput<OBody>
  >;

  get(): Route<Context, "get", Paths, SearchParams, IBody>;
  post<P>(parser: P): Route<Context, "post", Paths, SearchParams, P>;
  put<P>(parser: P): Route<Context, "put", Paths, SearchParams, P>;
  delete(): Route<Context, "delete", Paths, SearchParams, IBody>;
}

export function createBuilder(initDef: Partial<RouteBuilderDef> = {}) {
  const { middlewares = [], paths = [], searchParams = {}, ...rest } = initDef;

  const _def: RouteBuilderDef = {
    middlewares,
    paths,
    searchParams,
    ...rest,
  };

  const builder = {
    _def,
    path: (...args) => {
      const paths: any = args.map((item) => {
        if (typeof item === "string") return item;
        if (Array.isArray(item)) {
          return [item[0], getParseFn(item[1])];
        }

        throw new Error("Invalid paths");
      });

      return createBuilder({
        ..._def,
        paths,
      });
    },

    searchParam: (queries) => {
      const searchParams: RouteBuilderDef["searchParams"] = {};

      return createBuilder({
        ..._def,
        searchParams,
      });
    },

    use: (cb) => {
      const middlewares = _def.middlewares;
      middlewares.push(cb);
      return createBuilder({
        ..._def,
        middlewares,
      });
    },
  } as Route<{}, string, [], {}, unknown>;

  return builder;
}

let route = createBuilder()
  .path("user", ["username", z.enum(["dhrjarun", "dd"])], "c", [
    "age",
    z.number(),
  ])
  .searchParam({
    byId: z.string(),
  })
  .use(({ next, ctx }) => {
    return next({
      ctx: {
        info: "The box",
      },
    });
  })
  .use(({ next, ctx, params }) => {
    return next({
      ctx: {
        anotherInfo: "The big box",
      },
    });
  })
  .post(
    z.object({
      id: z.string(),
    })
  )
  .resolve(({ send, body, params, searchParams, method }) => {
    return send({
      body: "info from body" as const,
    });
  });

export type inferPathType<T> = T extends [
  infer First extends string | [string, Parser],
  ...infer Tail
]
  ? `${First extends [string, infer P]
      ? inferParserType<P>
      : First}/${inferPathType<Tail>}`
  : "";

type PathTuple = [
  "aaa",
  "bbb" | "BBB",
  ["username", z.ZodEnum<["dhrjarun", "dd"]>]
];

type PathStr = inferPathType<PathTuple>;
