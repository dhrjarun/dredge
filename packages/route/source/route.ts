import { DataTypes, trimSlashes } from "dredge-common";
import type { AnyRoute, Route, Parser } from "dredge-types";
import { validateInput, validateOutput, validateParams } from "./validate";
import { composeMiddlewares } from "./compose";
import { RawRequest, RawResponse } from "dredge-types";

export type RouteBuilderDef = {
  method?: string;
  paths: string[];
  params: Record<string, Parser | null>;
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
    dataTypes = new DataTypes(),
    ...rest
  } = initDef;

  const _def: RouteBuilderDef = {
    middlewares,
    errorMiddlewares,
    paths,
    params,
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
          schema: this._schema,
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
          schema: this._schema,
        };
        await errorFn(errorContext, () => {});
        return errorContext.response;
      }
    },

    get _schema() {
      return {
        method: _def.method ?? null,
        paths: [..._def.paths],
        params: {
          ..._def.params,
        },
        input: _def.input ?? null,
        output: _def.output ?? null,
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
      const _params = _def.params;

      const paths = trimSlashes(path).split("/");
      const params: Record<string, Parser | null> = {};

      const pathRegex = /[a-z A-Z 0-9 . - _ ~ ! $ & ' ( ) * + , ; = : @]+/;
      paths.forEach((item) => {
        if (!pathRegex.test(item)) {
          throw new Error(`invalid path ${item}`);
        }
      });

      const newParamPaths = paths.reduce((acc: string[], item) => {
        if (item.startsWith(":")) {
          if (_params[item]) {
            throw new TypeError(`param '${item}' is used more than once`);
          }

          if (Object.hasOwn(_params, item.replace(":", "?"))) {
            throw new TypeError(
              `A query param is already defined with this name: ${item.replace(":", "")}`,
            );
          }

          if (acc.includes(item)) {
            throw new TypeError(`param '${item}' is used more than once`);
          }

          acc.push(item);
          params[item] = null;
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
        params: {
          ..._params,
          ...params,
        },
      });
    },

    params(paramsInit) {
      const _params = _def.params;

      const params: Record<string, Parser | null> = {};

      Object.entries(paramsInit).forEach(([param]) => {
        if (_params[`:${param}`]) {
          throw `${param} param schema already defined`;
        }

        if (_params[`?${param}`]) {
          throw `${param} query schema already defined`;
        }

        const isParam = Object.hasOwn(_params, `:${param}`);

        if (isParam) {
          params[`:${param}`] = paramsInit[param] ?? null;
        } else {
          params[`?${param}`] = paramsInit[param] ?? null;
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
