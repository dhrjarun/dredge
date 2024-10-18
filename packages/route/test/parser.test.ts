import * as a from "arktype";
import * as s from "superstruct";
import * as v from "valibot";
import { describe, expect, test } from "vitest";
import * as yup from "yup";
import * as z from "zod";
import { getParseFn } from "../source/parser";

const testCases = [
  {
    name: "Zod",
    schemas: {
      string: z.string(),
      number: z.number(),
      boolean: z.boolean(),
      object: z.object({ key: z.string() }),
      array: z.array(z.number()),
    },
  },
  {
    name: "Yup",
    schemas: {
      string: yup.string().strict(),
      number: yup.number(),
      boolean: yup.boolean(),
      object: yup.object({ key: yup.string().strict() }),
      array: yup.array().of(yup.number()),
    },
  },
  {
    name: "Superstruct",
    schemas: {
      string: s.string(),
      number: s.number(),
      boolean: s.boolean(),
      object: s.object({ key: s.string() }),
      array: s.array(s.number()),
    },
  },
  {
    name: "Valibot",
    schemas: {
      string: v.parser(v.string()),
      number: v.parser(v.number()),
      boolean: v.parser(v.boolean()),
      object: v.parser(v.object({ key: v.string() })),
      array: v.parser(v.array(v.number())),
    },
  },
  {
    name: "Arktype",
    schemas: {
      string: a.type("string"),
      number: a.type("number"),
      boolean: a.type("boolean"),
      object: a.type({
        key: "string",
      }),
      array: a.type("number[]"),
    },
  },
  {
    name: "Custom defined function",
    schemas: {
      string: (value: any) => {
        return z.string().parse(value);
      },
      number: (value: any) => {
        return z.number().parse(value);
      },
      boolean: (value: any) => {
        return z.boolean().parse(value);
      },
      object: (value: any) => {
        return z
          .object({
            key: z.string(),
          })
          .parse(value);
      },
      array: (value: any) => {
        return z.array(z.number()).parse(value);
      },
    },
  },
];

const validInputs = {
  string: "test",
  number: 42,
  boolean: true,
  object: { key: "value" },
  array: [1, 2, 3],
};

describe("getParseFn()", () => {
  test.each(testCases)(
    "resolves with $name given the valid input",
    async ({ schemas }) => {
      for (const [type, schema] of Object.entries(schemas)) {
        const parseFn = getParseFn(schema);
        const validInput = validInputs[type as keyof typeof validInputs];

        expect(await parseFn(validInput)).toStrictEqual(validInput);
      }
    },
  );

  const invalidInputs = {
    string: 22,
    number: false,
    boolean: "not a boolean",
    object: [1, 2, 3],
    array: {
      key: 123,
    },
  };

  test.each(testCases)(
    "rejects with $name given the invalid input",
    async ({ schemas }) => {
      for (const [type, schema] of Object.entries(schemas)) {
        const parseFn = getParseFn(schema);
        const invalidInput = invalidInputs[type as keyof typeof invalidInputs];

        expect(
          new Promise(async (resolve, reject) => {
            try {
              const result = await parseFn(invalidInput);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }),
        ).rejects.toThrow();
      }
    },
  );
});
