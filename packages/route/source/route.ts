import { MimeStore, trimSlashes } from "dredge-common";
import type { AnyRoute, RouteBuilderDef, Route } from "dredge-types";

export function dredgeRoute<Context extends Record<string, any> = {}>() {
  return createRouteBuilder() as Route<
    {
      initialContext: Context;
      modifiedInitialContext: Context;
      withDynamicPath: false;
      dataTypes: {};
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
    queries = {},
    dataTypes = {},
    dataTransformer = {},
    ...rest
  } = initDef;

  const _def: RouteBuilderDef = {
    dataTransformer,
    middlewares,
    errorMiddlewares,
    paths,
    params,
    queries,
    method,
    dataTypes,
    dataSerializers: new MimeStore<any>(),
    bodyParsers: new MimeStore<any>(),
    ...rest,
  };

  const builder = {
    _def,

    options: (options = {}) => {
      const _dataTypes = _def.dataTypes || {};
      const { dataTypes = {} } = options;

      const newDataTypes: Record<string, string> = {
        ...dataTypes,
        ..._dataTypes,
      };

      function findMediaType(dataType: string | string[]) {
        if (Array.isArray(dataType)) {
          const mediaType = dataType.map((type) => {
            const item = newDataTypes[type as string];
            if (!item) {
              throw `Invalid DataType: ${type}`;
            }

            return item;
          });

          return mediaType;
        }
        const mediaType = newDataTypes[dataType];
        if (!mediaType) {
          throw `Invalid DataType: ${dataType}`;
        }
        return mediaType;
      }

      const notAllowedDataTypes = [
        "url",
        "method",
        "headers",
        "body",
        "baseUrl",

        "status",
        "statusText",
        "data",

        "params",
        "param",
        "queries",
        "query",

        "get",
        "post",
        "put",
        "delete",
        "patch",
        "head",

        "dataType",
        "responseDataType",

        "context",
        "ctx",
      ];

      Object.keys(notAllowedDataTypes)?.forEach((item) => {
        if (notAllowedDataTypes.includes(item)) {
          throw `Invalid DataType: ${item}`;
        }
      });

      return createRouteBuilder({
        ..._def,
        dataTypes: newDataTypes,
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

      Object.entries(params).forEach(([path]) => {
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

    queries: (queries) => {
      const _queries = _def.queries;

      // check if it already defined
      Object.entries(queries).forEach(([name]) => {
        if (_queries[name]) {
          throw `${name} query schema already defined`;
        }

        // validate parser
      });

      return createRouteBuilder({
        ..._def,
        queries: {
          ..._queries,
          ...queries,
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

    method: (method) => {
      const _method = _def.method;

      if (_method) {
        throw "Method is already defined";
      }

      return createRouteBuilder({
        ..._def,
        method,
      });
    },

    input(parser) {
      const _parser = _def.iBody;

      if (_parser) {
        throw "Request data schema is already defined";
      }

      if (parser) {
        return createRouteBuilder({
          ..._def,
          iBody: parser,
        });
      }
    },

    output(parser) {
      const _parser = _def.oBody;

      if (_parser) {
        throw "Response data schema is already defined";
      }

      if (parser) {
        return createRouteBuilder({
          ..._def,
          oBody: parser,
        });
      }
    },
  } as AnyRoute;

  const aliases = ["get", "post", "put", "delete", "patch", "head"] as const;
  for (const item of aliases) {
    const fn = () => builder.method(item) as any;
    builder[item] = fn;
  }

  return builder;
}
