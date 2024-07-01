import {
  AnyUnresolvedRoute,
  Parser,
  RouteBuilderDef,
  UnresolvedRoute,
  trimSlashes,
} from "@dredge/common";

export function dredgeRoute<Context extends object>() {
  return createRouteBuilder() as UnresolvedRoute<
    {
      initialContext: Context;
    },
    Context,
    Context,
    string,
    [],
    {},
    {}
  >;
}

export function createRouteBuilder(initDef: Partial<RouteBuilderDef> = {}) {
  const {
    method,
    middlewares = [],
    errorMiddlewares = [],
    paths = [],
    params = {},
    searchParams = {},
    dataTypes = [],
    ...rest
  } = initDef;

  const _def: RouteBuilderDef = {
    isResolved: false,
    middlewares,
    errorMiddlewares,
    paths,
    params,
    searchParams,
    method,
    dataTypes,
    ...rest,
  };

  const builder = {
    _def,

    options: ({ dataTypes } = {}) => {
      const notAllowedDataTypes = [
        "default",
        "data",
        "params",
        "param",
        "searchParams",
        "searchParam",
        "method",
        "get",
        "post",
        "put",
        "delete",
        "patch",
        "head",
        "headers",
        "resolve",
        "use",
      ];
      dataTypes?.forEach((item) => {
        if (notAllowedDataTypes.includes(item)) {
          throw `Invalid DataType: ${item}`;
        }
      });

      return createRouteBuilder({
        ..._def,
        dataTypes,
      });
    },

    path: (path) => {
      const _paths = _def.paths;
      const paths = trimSlashes(path).split("/");

      const pathRegex = /[a-z A-Z 0-9 . - _ ~ ! $ & ' ( ) * + , ; = : @]+/;
      paths.forEach((item) => {
        if (!pathRegex.test(item)) {
          throw new Error(`invalid path ${item}`);
        }
      });

      const newParamPaths = paths.reduce((acc: string[], item) => {
        if (item.startsWith(":")) {
          if (acc.includes(item)) {
            throw new Error(`Param '${item}' is used more than once`);
          }

          acc.push(item);
        }

        return acc;
      }, []);

      _paths.forEach((item) => {
        if (newParamPaths.includes(item)) {
          throw new Error(`Param '${item}' is already defined`);
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
        if (_params[path]) {
          throw `${path} param schema already defined`;
        }

        if (!_paths.includes(`:${path}`)) {
          throw `Param '${path}' is not defined`;
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

    searchParams: (searchParams) => {
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
      const middlewares = [..._def.middlewares];
      middlewares.push(cb);
      return createRouteBuilder({
        ..._def,
        middlewares,
      });
    },

    error(cb) {
      const errorMiddlewares = [..._def.errorMiddlewares];
      errorMiddlewares.push(cb);
      return createRouteBuilder({
        ..._def,
        errorMiddlewares,
      });
    },

    method: (method, parser) => {
      const _paths = _def.paths;
      const _method = _def.method;
      const _parser = _def.iBody;

      if (_method || _parser) {
        throw "Method and request data schema is already defined";
      }

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

    output(parser) {
      const _parser = _def.oBody;

      if (_parser) {
        throw "Response data schema is already defined";
      }

      return createRouteBuilder({
        ..._def,
        oBody: parser,
      });
    },

    build() {
      const _paths = _def.paths;
      const _method = _def.method;
      const _parser = _def.iBody;

      if (!_paths.length) {
        throw "Paths are not defined";
      }

      if (!_method) {
        throw "Method is not defined";
      }

      return {
        _def: {
          ..._def,
          isResolved: true,
        },
      };
    },

    // resolve: (fn) => {
    //   if (_def.resolver) throw "Resolver already exist";

    //   const route = createRouteBuilder({
    //     ..._def,
    //     resolver: fn,
    //   });

    //   return {
    //     _def: {
    //       ...route._def,
    //       isResolved: true,
    //     },
    //   };
    // },
  } as AnyUnresolvedRoute;

  const aliases = ["get", "post", "put", "delete", "patch", "head"] as const;
  for (const item of aliases) {
    const fn = (bodyParser?: Parser) => builder.method(item, bodyParser) as any;
    builder[item] = fn;
  }

  return builder;
}
