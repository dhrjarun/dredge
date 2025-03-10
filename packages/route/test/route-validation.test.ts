import { expect, test } from "vitest";
import z from "zod";
import {
  validateInput,
  validateOutput,
  validateParams,
} from "../source/validate";

test("validateParams", () => {
  const schema = {
    string: z.string(),
    number: z.number(),
    boolean: z.boolean(),
    list: z.array(z.string()),
    tuple: z.tuple([z.string(), z.number()]),
  };

  expect(
    validateParams(schema, {
      string: "hello",
      number: 1,
      boolean: true,
      list: ["a", "b", "c"],
      tuple: ["a", 1],
    }),
  ).resolves.toStrictEqual({
    string: "hello",
    number: 1,
    boolean: true,
    list: ["a", "b", "c"],
    tuple: ["a", 1],
  });
});

test("passthrough when parser is null or undefined", () => {
  const schema: any = {
    string: null,
    number: undefined,
    boolean: z.boolean(),
  };

  expect(
    validateParams(schema, {
      string: "hello",
      number: 1,
      boolean: true,
    }),
  ).resolves.toStrictEqual({
    string: "hello",
    number: 1,
    boolean: true,
  });
});

test("optional searchParam should work", async () => {
  const schema = {
    required: z.string(),
    optional: z.string().optional(),
  };

  expect(
    validateParams(schema, {
      required: "i am required",
    }),
  ).resolves.toMatchObject({
    required: "i am required",
  });
});

test("unSpecified key in schema should not be passed", async () => {
  const schema = {
    i: z.number(),
    o: z.string().optional(),
  };

  const validated = await validateParams(schema, {
    i: 1,
    a: "apple",
    b: "ball",
  });

  expect(validated).toStrictEqual({
    i: 1,
  });
});

test("validateInput", () => {
  const schema = z.enum(["a", "b", "c"]);

  expect(validateInput(schema, "a")).resolves.toBe("a");
  expect(validateInput(schema, "b")).resolves.toBe("b");
  expect(validateInput(schema, "c")).resolves.toBe("c");

  expect(validateInput(schema, "d")).rejects.toThrowError();
});

test("validateOutput", () => {
  const schema = z.enum(["a", "b", "c"]);

  expect(validateOutput(schema, "a")).resolves.toBe("a");
  expect(validateOutput(schema, "b")).resolves.toBe("b");
  expect(validateOutput(schema, "c")).resolves.toBe("c");

  expect(validateOutput(schema, "d")).rejects.toThrowError();
});
