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

export async function validateParams(
  schema: Record<string, Parser | null>,
  params: Record<string, any>,
) {
  const validatedParams: Record<string, any> = {};
  for (const [key, parser] of Object.entries(schema)) {
    const value = params[key];

    if (!parser) {
      validatedParams[key] = value;
      continue;
    }

    if (value === undefined) {
      await getValidatorFn(parser, "PARAMS")(undefined);
      continue;
    }

    validatedParams[key] = await getValidatorFn(parser, "PARAMS")(value);
  }

  return validatedParams;
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
