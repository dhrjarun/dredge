import {
  DataTypes,
  DredgeSchema,
  convertToDredgeSchema,
  trimSlashes,
} from "dredge-common";
import type { AnyRoute, Parser, Route } from "dredge-types";
import { RawResponse } from "dredge-types";
import { composeMiddlewares } from "./compose";
import { Context } from "./context";
import { D } from "./d";
import { validateInput, validateOutput, validateParams } from "./validate";

export type RouteBuilderDef = {
  method?: string;
  paths: string[];
  params: Record<string, DredgeSchema | null>;
  dataTypes: DataTypes;
  input?: DredgeSchema;
  output?: DredgeSchema;
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

function cloneRouteBuilder(
  initDef: Partial<RouteBuilderDef> = {},
  def: RouteBuilderDef,
) {
  const {
    method,
    middlewares = [],
    errorMiddlewares = [],
    paths = [],
    params = {},
    dataTypes,
    input,
    output,
  } = initDef;

  return createRouteBuilder({
    method: method ?? def.method,
    middlewares: [...def.middlewares, ...middlewares],
    errorMiddlewares: [...def.errorMiddlewares, ...errorMiddlewares],
    paths: [...def.paths, ...paths],
    params: { ...def.params, ...params },
    dataTypes: new DataTypes({
      ...def.dataTypes.toRecord(),
      ...dataTypes?.toRecord(),
    }),
    input: input ?? def.input,
    output: output ?? def.output,
  });
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
    input,
    output,
  } = initDef;

  const _def: RouteBuilderDef = {
    middlewares,
    errorMiddlewares,
    paths,
    params,
    method,
    dataTypes,
    input,
    output,
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

        const request = rawcontext.request;

        const successFn = composeMiddlewares(_def.middlewares);
        const successContext = {
          state: {
            ...rawcontext.state,
          },
          response: rawcontext.response || defaultResponse,
          request: request,
          dataTypes: _def.dataTypes,
          schema: this._schema,
        };
        await successFn(successContext, () => {});

        const response = {
          ...successContext.response,
        };

        return response;
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
      const params: Record<string, DredgeSchema | null> = {};

      const pathRegex = /[a-z A-Z 0-9 . - _ ~ ! $ & ' ( ) * + , ; = : @]+/;
      paths.forEach((item) => {
        if (!pathRegex.test(item)) {
          throw new Error(`invalid path ${item}`);
        }
      });

      const newParamPaths = paths.reduce((acc: string[], item) => {
        if (item.startsWith(":")) {
          if (Object.hasOwn(_params, item.slice(1))) {
            throw new TypeError(
              `A param is already defined with this name: ${item.slice(1)}`,
            );
          }

          if (acc.includes(item)) {
            throw new TypeError(
              `param '${item.slice(1)}' is used more than once`,
            );
          }

          acc.push(item);
          params[item.slice(1)] = null;
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
      const paramsSchema: Record<string, DredgeSchema | null> = {};
      for (const [key, schema] of Object.entries(paramsInit)) {
        if (_def.params[key]) {
          throw `${key} param already defined`;
        }

        if (schema === null) {
          paramsSchema[key] = null;
          continue;
        }
        paramsSchema[key] = convertToDredgeSchema(schema);
      }

      const middleware = (ctx: Context, d: D) => {
        const validated = validateParams(paramsInit, ctx.req.params);

        d.req({
          params: validated,
        });
      };

      return cloneRouteBuilder(
        {
          middlewares: [middleware],
          params: paramsSchema,
        },
        _def,
      );
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

      const middleware = (ctx: Context, d: D) => {
        const validated = validateInput(parser, ctx.req.data);

        d.req({
          data: validated,
        });
      };

      return cloneRouteBuilder(
        {
          middlewares: [middleware],
          input: convertToDredgeSchema(parser) || undefined,
        },
        _def,
      );
    },

    output(parser: Parser) {
      const _parser = _def.output;

      if (_parser) {
        throw "Response data schema is already defined";
      }

      const middleware = async (ctx: Context, d: D) => {
        await d.next();
        const validated = validateOutput(parser, ctx.res.data);

        d.res({
          data: validated,
        });
      };

      return cloneRouteBuilder(
        {
          middlewares: [middleware],
          output: convertToDredgeSchema(parser) || undefined,
        },
        _def,
      );
    },
  };

  return builder;
}
