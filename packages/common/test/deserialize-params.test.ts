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
      array: z.array(z.number()),
      tuple: z.tuple([z.string(), z.number()]),
      optionalNumber: z.number().optional(),
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
      array: v.array(v.number()),
      tuple: v.tuple([v.string(), v.number()]),
      optionalNumber: v.optional(v.number()),
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
      array: yup.array(yup.number()),
      tuple: yup.tuple([yup.string(), yup.number()]),
      optionalNumber: yup.number().optional(),
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
      array: superStruct.array(superStruct.number()),
      optionalNumber: superStruct.optional(superStruct.number()),
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
      // array: ark.type("number[]"),
      // tuple: ark.type(["string", "number"]),
      optionalNumber: ark.type("number").optional(),
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
    array: ["1", "2", "3"],
    tuple: ["a", "1"],
  };

  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([key]) => Object.hasOwn(schema, key)),
  );

  const result = deserializeParams(filteredParams, schema);

  expect({
    number: 1,
    boolean: true,
    date: expect.any(Date),
    string: "apple",
    enum: "a",
    array: [1, 2, 3],
    tuple: ["a", 1],
  }).toMatchObject(result);
});
