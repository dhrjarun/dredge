import type { Parser } from "dredge-types";
import { getParseFn } from "./parser";

export class ValidationError extends Error {
  issue: any;
  type: ValidationType;

  constructor(type: ValidationType, issue: any) {
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

type ValidationType = "PARAMS" | "INPUT" | "OUTPUT";

// export async function validateParams(
//   schema: Record<string, Parser | null>,
//   params: any,
// ) {
//   const validatedParams: Record<string, any> = {};
//   for (const [key, value] of Object.entries(params)) {
//     const parser = schema[key];
//
//     validatedParams[key] = parser
//       ? await getValidatorFn(parser, "PARAMS")(value)
//       : value;
//   }
//
//   return validatedParams;
// }

export async function validateParams(
  schema: Record<string, Parser | null>,
  queries: any, // TODO: add an option to whether or not to pass query if their schema is not defined
) {
  const validatedQueries: Record<string, any> = {
    ...queries,
  };

  for (const [key, parser] of Object.entries(schema)) {
    const paramType = key.charAt(0);

    if (paramType === ":") {
      const value = queries[key];

      validatedQueries[key] = parser
        ? await getValidatorFn(parser, "PARAMS")(value)
        : value;
    }

    if (paramType === "?") {
      const values = queries[key];
      const validatedValues: any[] = [];

      if (!parser) {
        validatedQueries[key] = values;
        continue;
      }

      if (!values) {
        await getValidatorFn(parser, "PARAMS")(undefined);
        continue;
      }

      for (const item of values) {
        validatedValues.push(await getValidatorFn(parser, "PARAMS")(item));
      }

      validatedQueries[key] = validatedValues;
    }
  }

  return validatedQueries;
}
export async function validateInput(schema: Parser, input: any) {
  let validatedData: unknown;
  if (schema) {
    validatedData = await getValidatorFn(schema, "INPUT")(input);
  }
  return validatedData || input;
}

export async function validateOutput(schema: Parser, output: any) {
  let validatedData: unknown;
  if (schema) {
    validatedData = await getValidatorFn(schema, "OUTPUT")(output);
  }
  return validatedData || output;
}
