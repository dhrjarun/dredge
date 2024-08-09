import { MimeStore, trimSlashes } from "@dredge/common";
import {
  AnyUnresolvedRoute,
  RouteBuilderDef,
  UnresolvedRoute,
} from "@dredge/types";
import { Parser } from "./parser";

export function dredgeRoute<Context extends Record<string, any> = {}>() {
  return createRouteBuilder() as UnresolvedRoute<
    {
      initialContext: Context;
      modifiedInitialContext: Context;
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
    dataTypes = {},
    dataTransformer = {},
    ...rest
  } = initDef;

  const _def: RouteBuilderDef = {
    isResolved: false,
    dataTransformer,
    middlewares,
    errorMiddlewares,
    paths,
    params,
    searchParams,
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
      const _defaultContext = _def.defaultContext || {};
      const _dataTransformer = _def.dataTransformer;
      const _dataSerializers = _def.dataSerializers;
      const _bodyParsers = _def.bodyParsers;

      const {
        dataTypes = {},
        dataTransformer = {},
        defaultContext = {},
        dataSerializers = [],
        bodyParsers = [],
      } = options;

      const newDataTypes: Record<string, string> = {
        ...dataTypes,
        ..._dataTypes,
      };

      const newDataSerializers = _dataSerializers.clone();
      const newBodyParsers = _bodyParsers.clone();

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

      dataSerializers.forEach((item) => {
        let mediaType = item.mediaType;
        if (!mediaType && !item.dataType) {
          throw "mediaType or dataType must be given";
        }

        if (!mediaType) {
          mediaType = findMediaType(item.dataType as string | string[]);
        }

        if (Array.isArray(mediaType) && mediaType.length == 0) {
          throw "could not find any mediaType";
        }

        newDataSerializers.set(mediaType, item.fn);
      });

      bodyParsers.forEach((item) => {
        let mediaType = item.mediaType;
        if (!mediaType && !item.dataType) {
          throw "mediaType or dataType must be given";
        }

        if (!mediaType) {
          mediaType = findMediaType(item.dataType as string | string[]);
        }

        if (Array.isArray(mediaType) && mediaType.length == 0) {
          throw "could not find any mediaType";
        }

        newBodyParsers.set(mediaType, item.fn);
      });

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
        "searchParams",
        "searchParam",

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

      const newDataTransformer: any = {
        ..._dataTransformer,
      };

      for (const [key, value] of Object.entries(dataTransformer)) {
        newDataTransformer[key] = {
          ..._dataTransformer[key],
          ...(value as any),
        };
      }

      return createRouteBuilder({
        ..._def,
        defaultContext: {
          ..._defaultContext,
          ...defaultContext,
        },
        dataTypes: newDataTypes,
        bodyParsers: newBodyParsers,
        dataSerializers: newDataSerializers,
        dataTransformer: newDataTransformer,
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
  } as AnyUnresolvedRoute;

  const aliases = ["get", "post", "put", "delete", "patch", "head"] as const;
  for (const item of aliases) {
    const fn = (bodyParser?: Parser) => builder.method(item, bodyParser) as any;
    builder[item] = fn;
  }

  return builder;
}
