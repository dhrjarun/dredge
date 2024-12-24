import * as ark from "arktype";
import * as superStruct from "superstruct";
import * as v from "valibot";
import { expect, test } from "vitest";
import * as yup from "yup";
import { z } from "zod";
import { deserializeParams } from "../source/deserialize-params";

const schemas = [
  {
    name: "zod",
    schema: {
      number: z.number(),
      boolean: z.boolean(),
      date: z.date(),
      string: z.string(),
      enum: z.enum(["a", "b", "c"]),
      optionalNumber: z.number().optional(),
      noSuppoted: z.object({
        any: z.any(),
      }),
    },
  },
  {
    name: "valibot",
    schema: {
      number: v.number(),
      boolean: v.boolean(),
      date: v.date(),
      string: v.string(),
      enum: v.picklist(["a", "b", "c"]),
      optionalNumber: v.optional(v.number()),
      notSupported: v.object({
        any: v.any(),
      }),
    },
  },
  {
    name: "yup",
    schema: {
      number: yup.number(),
      boolean: yup.boolean(),
      date: yup.date(),
      string: yup.string(),
      enum: yup.string().oneOf(["a", "b", "c"]),
      optionalNumber: yup.number().optional(),
      notSupported: yup.object({
        any: yup.string(),
      }),
    },
  },
  {
    name: "superStruct",
    schema: {
      number: superStruct.number(),
      boolean: superStruct.boolean(),
      date: superStruct.date(),
      string: superStruct.string(),
      enum: superStruct.string(),
      optionalNumber: superStruct.optional(superStruct.number()),
      notSupported: superStruct.object({
        any: superStruct.any(),
      }),
    },
  },
  {
    name: "arktype",
    schema: {
      number: ark.type("number"),
      boolean: ark.type("boolean"),
      date: ark.type("Date"),
      string: ark.type("string"),
      enum: ark.type("'a' | 'b' | 'c'"),
      optionalNumber: ark.type("number").optional(),
      notSupported: ark.type({}),
    },
  },
];

test.each(schemas)("deserializeParams with $name", ({ schema }) => {
  const params = {
    number: "1",
    boolean: "true",
    date: "2023-01-01",
    string: "apple",
    enum: "a",
    notSupported: "not-supported",
  };

  const result = deserializeParams(params, schema);

  expect(result).toStrictEqual({
    number: 1,
    boolean: true,
    date: expect.any(Date),
    string: "apple",
    enum: "a",
    notSupported: "not-supported",
  });

  expect(
    deserializeParams(
      {
        optionalNumber: "9",
      },
      schema,
    ),
  ).toStrictEqual({
    optionalNumber: 9,
  });
});

test.each(schemas)("deserializeQueries with $name", ({ schema }) => {
  const queries = {
    number: ["1", "2", "3"],
    boolean: ["true", "false"],
    date: ["2023-01-01", "2023-02-02"],
    string: ["apple"],
    optionalNumber: ["1", "2", "3"],
    notSupported: ["not-supported"],
    noSchema: ["no-schema"],
    enum: ["a", "b"],
  };

  const result = deserializeParams(queries, schema);

  expect(result).toStrictEqual({
    number: [1, 2, 3],
    boolean: [true, false],
    date: [expect.any(Date), expect.any(Date)],
    string: ["apple"],
    enum: ["a", "b"],
    optionalNumber: [1, 2, 3],
    notSupported: ["not-supported"],
    noSchema: ["no-schema"],
  });
});
