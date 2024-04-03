import { Route, RouteBuilderDef, AnyRoute } from "@dredge/common";
import { Parser } from "./parser";

export function dredgeRoute<ServerCtx extends object>() {
  return createRouteBuilder() as Route<ServerCtx, "get", [], {}, {}>;
}

export function createRouteBuilder(initDef: Partial<RouteBuilderDef> = {}) {
  const {
    method = "get",
    middlewares = [],
    paths = [],
    params = {},
    searchParams = {},
    ...rest
  } = initDef;

  const _def: RouteBuilderDef = {
    middlewares,
    paths,
    params,
    searchParams,
    method,
    ...rest,
  };

  const builder = {
    _def,

    error: (fn) => {
      return createRouteBuilder({
        ..._def,
        errorResolver: fn,
      });
    },

    path: (...paths) => {
      const _paths = _def.paths;

      const pathRegex = /[a-z A-Z 0-9 . - _ ~ ! $ & ' ( ) * + , ; = : @]+/;
      paths.forEach((item) => {
        if (!pathRegex.test(item)) {
          throw `invalid path ${item}`;
        }
      });

      const newParamPaths = paths.reduce((acc: string[], item) => {
        if (item.startsWith(":")) acc.push(item);
        return acc;
      }, []);
      _paths.forEach((item) => {
        if (newParamPaths.includes(item)) {
          throw `param '${item}' is already defined`;
        }
      });

      return createRouteBuilder({
        ..._def,
        paths: [..._paths, ...paths],
      });
    },

    params: (params) => {
      const _params = _def.params;
      const _paths = _def.paths;

      Object.entries(params).forEach(([path, parser]) => {
        // check if it is already defined - might not be useful sometimes
        if (_params[path]) {
          throw `${path} param schema already defined`;
        }

        // check if path is defined or not - I guess it doesn't need. it would be useful to define params before defining corresponding path
        if (!_paths.includes(`:${path}`)) {
          throw `:${path} is not defined`;
        }

        // validate parser
      });

      return createRouteBuilder({
        ..._def,
        params: {
          ..._params,
          ...params,
        },
      });
    },

    searchParam: (searchParams) => {
      const _searchParams = _def.searchParams;

      // check if it already defined
      Object.entries(searchParams).forEach(([name, parser]) => {
        if (_searchParams[name]) {
          throw `${name} searchParam schema already defined`;
        }

        // validate parser
      });

      return createRouteBuilder({
        ..._def,
        searchParams: {
          ..._searchParams,
          ...searchParams,
        },
      });
    },

    use: (cb) => {
      const middlewares = _def.middlewares;
      middlewares.push(cb);
      return createRouteBuilder({
        ..._def,
        middlewares,
      });
    },

    method: (method, parser) => {
      if (parser) {
        return createRouteBuilder({
          ..._def,
          method,
          iBody: parser,
        });
      }

      return createRouteBuilder({
        ..._def,
        method,
      });
    },

    resolve: (fn) => {
      if (_def.resolver) throw "Resolver already exist";

      return createRouteBuilder({
        ..._def,
        resolver: fn,
      });
    },
  } as AnyRoute;

  const aliases = ["get", "post", "put", "delete", "patch", "head"] as const;
  for (const item of aliases) {
    builder[item] = (bodyParser?: Parser) => builder.method(item, bodyParser);
  }

  return builder;
}
