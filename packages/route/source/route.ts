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
import { RawRequest } from "./request";

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

  const _def: RouteBuilderDef = {
    middlewares,
    errorMiddlewares,
    paths,
    params,
    queries,
    method,
    dataTypes,
    ...rest,
  };

  async function validateRequest(rawRequest: RawRequest) {
    const validateRequest = { ...rawRequest };

    validateRequest.params = await validateParams(
      _def.params,
      validateRequest.params,
    );
    validateRequest.queries = await validateQueries(
      _def.queries,
      validateRequest.queries,
    );
    validateRequest.data = await validateInput(
      _def.input!!,
      validateRequest.data,
    );

    return validateRequest;
  }

  const builder: AnyRoute = {
    async _handle(rawcontext) {
      const defaultResponse: RawResponse = {
        headers: {},
      };
      try {
        if (rawcontext.error !== undefined) {
          throw rawcontext.error;
        }

        const validatedRequest = await validateRequest(rawcontext.request);

        const successFn = composeMiddlewares(_def.middlewares);
        const successContext = {
          state: {
            ...rawcontext.state,
          },
          response: rawcontext.response || defaultResponse,
          request: validatedRequest,
          dataTypes: _def.dataTypes,
        };
        await successFn(successContext, () => {});

        const validatedResponse = {
          ...successContext.response,
        };

        validatedResponse.data = await validateOutput(
          _def.output!,
          successContext.response.data,
        );
        return validatedResponse;
      } catch (error) {
        const errorFn = composeMiddlewares(_def.errorMiddlewares);
        const errorContext = {
          request: rawcontext.request,
          response: rawcontext.response || defaultResponse,
          state: {
            ...rawcontext.state,
          },
          dataTypes: _def.dataTypes,
          error,
        };
        await errorFn(errorContext, () => {});
        return errorContext.response;
      }
    },

    get _schema() {
      return {
        method: _def.method,
        paths: [..._def.paths],
        params: {
          ..._def.params,
        },
        queries: {
          ..._def.queries,
        },
        input: _def.input,
        output: _def.output,
      };
    },

    options(options) {
      const _dataTypes = _def.dataTypes.toRecord();
      const { dataTypes = {} } = options;

      const newDataTypes = new DataTypes({
        ..._dataTypes,
        ...dataTypes,
      });

      return createRouteBuilder({
        ..._def,
        dataTypes: newDataTypes,
      });
    },

    path(path: string) {
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

    params(params: Record<string, Parser>) {
      const _params = _def.params;
      const _paths = _def.paths;

      Object.entries(params).forEach(([path]) => {
        if (_params[path]) {
          throw `${path} param schema already defined`;
        }

        if (!_paths.includes(`:${path}`)) {
          throw `Param '${path}' is not defined`;
        }
      });

      return createRouteBuilder({
        ..._def,
        params: {
          ..._params,
          ...params,
        },
      });
    },

    queries(queries: Record<string, Parser>) {
      const _queries = _def.queries;

      // check if it already defined
      Object.entries(queries).forEach(([name]) => {
        if (_queries[name]) {
          throw `${name} query schema already defined`;
        }
      });

      return createRouteBuilder({
        ..._def,
        queries: {
          ..._queries,
          ...queries,
        },
      });
    },

    use(cb: Function) {
      const middlewares = [..._def.middlewares];
      middlewares.push(cb);
      return createRouteBuilder({
        ..._def,
        middlewares,
      });
    },

    error(cb: Function) {
      const errorMiddlewares = [..._def.errorMiddlewares];
      errorMiddlewares.push(cb);
      return createRouteBuilder({
        ..._def,
        errorMiddlewares,
      });
    },

    method(method: string) {
      const _method = _def.method;

      if (_method) {
        throw "Method is already defined";
      }

      return createRouteBuilder({
        ..._def,
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
      const _parser = _def.input;

      if (_parser) {
        throw "Request data schema is already defined";
      }

      return createRouteBuilder({
        ..._def,
        input: parser,
      });
    },

    output(parser: Parser) {
      const _parser = _def.output;

      if (_parser) {
        throw "Response data schema is already defined";
      }

      return createRouteBuilder({
        ..._def,
        output: parser,
      });
    },
  };

  return builder;
}
