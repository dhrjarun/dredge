import { expect, test } from "vitest";
import z from "zod";
import {
  validateParams,
  validateQueries,
  validateInput,
  validateOutput,
} from "../source/validate";

test("validateParams", () => {
  const schema = {
    string: z.string(),
    number: z.number(),
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

test("validateQueries", () => {
  const schema = {
    string: z.string(),
    number: z.number(),
    boolean: z.boolean(),
  };

  expect(
    validateQueries(schema, {
      string: ["hello"],
      number: [1],
      boolean: [true],
    }),
  ).resolves.toStrictEqual({
    string: ["hello"],
    number: [1],
    boolean: [true],
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

test("optional searchParam should work", async () => {
  const schema = {
    required: z.string(),
    optional: z.string().optional(),
  };

  expect(
    validateQueries(schema, {
      required: ["i am required"],
    }),
  ).resolves.toMatchObject({
    required: ["i am required"],
  });
});

test("unSpecified searchParam should work", async () => {
  const schema = {
    i: z.number(),
    o: z.string().optional(),
  };

  const validated = await validateQueries(schema, {
    i: [1],
    a: ["apple"],
    b: ["ball"],
  });

  expect(validated).toStrictEqual({
    i: [1],
    a: ["apple"],
    b: ["ball"],
  });
});
