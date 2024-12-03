import { DataTypes, trimSlashes } from "dredge-common";
import type { AnyRoute, Route, Parser } from "dredge-types";
import {
  validateInput,
  validateOutput,
  validateParams,
  validateQueries,
} from "./validate";
import { composeMiddlewares } from "./compose";
import { RawResponse } from "./response";

export type RouteBuilderDef = {
  method?: string;
  paths: string[];
  params: Record<string, Parser>;
  queries: Record<string, Parser>;
  dataTypes: DataTypes;
  input?: Parser;
  output?: Parser;

  middlewares: Function[];
  errorMiddlewares: Function[];
};

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

export function createRouteBuilder(
  initDef: Partial<RouteBuilderDef> = {},
): AnyRoute {
  const {
    method,
    middlewares = [],
    errorMiddlewares = [],
    paths = [],
    params = {},
    queries = {},
    dataTypes = new DataTypes(),
    ...rest
  } = initDef;

  const schema: RouteBuilderDef = {
    middlewares,
    errorMiddlewares,
    paths,
    params,
    queries,
    method,
    dataTypes,
    ...rest,
  };

  const builder: AnyRoute = {
    async _handle(rawcontext) {
      const defaultResponse: RawResponse = {
        headers: {},
      };
      try {
        if (rawcontext.error !== undefined) {
          throw rawcontext.error;
        }

        const validateRequest = { ...rawcontext.request };

        validateRequest.params = await validateParams(
          schema.params,
          validateRequest.params,
        );
        validateRequest.queries = await validateQueries(
          schema.queries,
          validateRequest.queries,
        );
        validateRequest.data = await validateInput(
          schema.input!!,
          validateRequest.data,
        );

        const successFn = composeMiddlewares(schema.middlewares);

        const successContext = {
          state: {
            ...rawcontext.state,
          },
          response: rawcontext.response || defaultResponse,
          request: validateRequest,
          dataTypes: schema.dataTypes,
        };
        await successFn(successContext, () => {});

        const validatedResponse = {
          ...successContext.response,
        };

        validatedResponse.data = await validateOutput(
          schema.output!,
          successContext.response.data,
        );
        return validatedResponse;
      } catch (error) {
        const errorFn = composeMiddlewares(schema.errorMiddlewares);
        const errorContext = {
          request: rawcontext.request,
          response: rawcontext.response || defaultResponse,
          state: {
            ...rawcontext.state,
          },
          dataTypes: schema.dataTypes,
          error,
        };
        await errorFn(errorContext, () => {});
        return errorContext.response;
      }
    },

    get _schema() {
      return {
        method: schema.method,
        paths: [...schema.paths],
        params: {
          ...schema.params,
        },
        queries: {
          ...schema.queries,
        },
        input: schema.input,
        output: schema.output,
      };
    },

    options(options) {
      const _dataTypes = schema.dataTypes.toRecord();
      const { dataTypes = {} } = options;

      const newDataTypes = new DataTypes({
        ..._dataTypes,
        ...dataTypes,
      });

      return createRouteBuilder({
        ...schema,
        dataTypes: newDataTypes,
      });
    },

    path(path: string) {
      const _paths = schema.paths;
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
        ...schema,
        paths: [..._paths, ...paths],
      });
    },

    params(params: Record<string, Parser>) {
      const _params = schema.params;
      const _paths = schema.paths;

      Object.entries(params).forEach(([path]) => {
        if (_params[path]) {
          throw `${path} param schema already defined`;
        }

        if (!_paths.includes(`:${path}`)) {
          throw `Param '${path}' is not defined`;
        }
      });

      return createRouteBuilder({
        ...schema,
        params: {
          ..._params,
          ...params,
        },
      });
    },

    queries(queries: Record<string, Parser>) {
      const _queries = schema.queries;

      // check if it already defined
      Object.entries(queries).forEach(([name]) => {
        if (_queries[name]) {
          throw `${name} query schema already defined`;
        }
      });

      return createRouteBuilder({
        ...schema,
        queries: {
          ..._queries,
          ...queries,
        },
      });
    },

    use(cb: Function) {
      const middlewares = [...schema.middlewares];
      middlewares.push(cb);
      return createRouteBuilder({
        ...schema,
        middlewares,
      });
    },

    error(cb: Function) {
      const errorMiddlewares = [...schema.errorMiddlewares];
      errorMiddlewares.push(cb);
      return createRouteBuilder({
        ...schema,
        errorMiddlewares,
      });
    },

    method(method: string) {
      const _method = schema.method;

      if (_method) {
        throw "Method is already defined";
      }

      return createRouteBuilder({
        ...schema,
        method,
      });
    },

    get() {
      return this.method("get");
    },
    post() {
      return this.method("post");
    },
    put() {
      return this.method("put");
    },
    delete() {
      return this.method("delete");
    },
    patch() {
      return this.method("patch");
    },
    head() {
      return this.method("head");
    },

    input(parser: Parser) {
      const _parser = schema.input;

      if (_parser) {
        throw "Request data schema is already defined";
      }

      return createRouteBuilder({
        ...schema,
        input: parser,
      });
    },

    output(parser: Parser) {
      const _parser = schema.output;

      if (_parser) {
        throw "Response data schema is already defined";
      }

      return createRouteBuilder({
        ...schema,
        output: parser,
      });
    },
  };

  return builder;
}
