import type { Parser } from "dredge-types";
import { RouteBuilderDef } from "./route";
import { getParseFn } from "./parser";
import { RawRequest } from "./request";

export class ValidationError extends Error {
  issue: any;
  type: ValidationType;

  constructor(
    type: "PARAMS" | "SEARCH_PARAMS" | "DATA" | "RESPONSE_DATA",
    issue: any,
  ) {
    super();

    this.type = type;
    this.issue = issue;
  }
}

function getValidatorFn(parser: Parser, step: ValidationType) {
  return async (value: any) => {
    const fn = getParseFn(parser);
    try {
      return await fn(value);
    } catch (error) {
      throw new ValidationError(step, error);
    }
  };
}

type ValidationType = "PARAMS" | "SEARCH_PARAMS" | "DATA" | "RESPONSE_DATA";

// export function getPathParams(routePath: string[]) {
//   return (pathArray: string[]) => {
//     const params: Record<string, string> = routePath.reduce(
//       (acc: any, item: string, index: number) => {
//         if (item.startsWith(":")) {
//           acc[item.replace(":", "")] = pathArray[index];
//         }
//         return acc;
//       },
//       {},
//     );
//
//     return params;
//   };
// }

export async function validateParams(
  schema: Record<string, Parser>,
  params: any,
) {
  const validatedParams: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    const parser = schema[key];

    validatedParams[key] = parser
      ? await getValidatorFn(parser, "PARAMS")(value)
      : value;
  }

  return validatedParams;
}

export async function validateQueries(
  schema: Record<string, Parser>,
  queries: any, // TODO: add an option to whether or not to pass query if their schema is not defined
) {
  const validatedQueries: Record<string, any> = {
    ...queries,
  };
  for (const [key, parser] of Object.entries(schema)) {
    const values = queries[key];
    const validatedValues: any[] = [];

    if (!values) {
      await getValidatorFn(parser, "SEARCH_PARAMS")(undefined);
      continue;
    }

    for (const item of values) {
      validatedValues.push(await getValidatorFn(parser, "SEARCH_PARAMS")(item));
    }

    validatedQueries[key] = validatedValues;
  }

  return validatedQueries;
}
export async function validateInput(schema: Parser, input: any) {
  let validatedData: unknown;
  if (schema) {
    validatedData = await getValidatorFn(schema, "DATA")(input);
  }
  return validatedData || input;
}
export async function validateOutput(schema: Parser, output: any) {
  let validatedData: unknown;
  if (schema) {
    validatedData = await getValidatorFn(schema, "DATA")(output);
  }
  return validatedData || output;
}

export function useValidate(routeDef: RouteBuilderDef) {
  return async (unValidatedRequest: RawRequest) => {
    let validatedRequest: RawRequest = { ...unValidatedRequest };

    const validatedParams: Record<string, any> = {};
    for (const [key, value] of Object.entries(unValidatedRequest.params)) {
      const parser = routeDef.params[key];

      validatedParams[key] = parser
        ? await getValidatorFn(parser, "PARAMS")(value)
        : value;
    }
    validatedRequest.params = validatedParams;

    const validatedQueries: Record<string, any> = {
      ...unValidatedRequest.queries, // TODO: add an option to whether or not to pass query if their schema is not defined
    };
    for (const [key, parser] of Object.entries(routeDef.queries)) {
      const values = unValidatedRequest.queries[key];
      const validatedValues: any[] = [];

      if (!values) {
        await getValidatorFn(parser, "SEARCH_PARAMS")(undefined);
        continue;
      }

      for (const item of values) {
        validatedValues.push(
          await getValidatorFn(parser, "SEARCH_PARAMS")(item),
        );
      }

      validatedQueries[key] = validatedValues;
    }
    validatedRequest.queries = validatedQueries;

    let validatedData: unknown;
    if (routeDef.input) {
      validatedData = await getValidatorFn(
        routeDef.input,
        "DATA",
      )(unValidatedRequest.data);
      validatedRequest.data = validatedData;
    }

    return validatedRequest;
  };
}
