import { expect, test } from "vitest";
import * as yup from "yup";
import * as superStruct from "superstruct";
import * as v from "valibot";
import { z } from "zod";
import {
  deserializeParams,
  deserializeSearchParams,
} from "../source/deserialize-params";

const schemas = [
  {
    name: "zod",
    schema: {
      number: z.number(),
      boolean: z.boolean(),
      date: z.date(),
      string: z.string(),
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
      optionalNumber: superStruct.optional(superStruct.number()),
      notSupported: superStruct.object({
        any: superStruct.any(),
      }),
    },
  },
];

test.each(schemas)("deserializeParams with $name", ({ schema }) => {
  const params = {
    number: "1",
    boolean: "true",
    date: "2023-01-01",
    string: "apple",
    notSupported: "not-supported",
  };

  const result = deserializeParams(params, schema);

  expect(result).toStrictEqual({
    number: 1,
    boolean: true,
    date: expect.any(Date),
    string: "apple",
    notSupported: "not-supported",
  });
});

test.each(schemas)("deserializeSearchParams with $name", ({ schema }) => {
  const searchParams = {
    number: ["1", "2", "3"],
    boolean: ["true", "false"],
    date: ["2023-01-01", "2023-02-02"],
    string: ["apple"],
    optionalNumber: ["1", "2", "3"],
    notSupported: ["not-supported"],
    noSchema: ["no-schema"],
  };

  const result = deserializeSearchParams(searchParams, schema);

  expect(result).toStrictEqual({
    number: [1, 2, 3],
    boolean: [true, false],
    date: [expect.any(Date), expect.any(Date)],
    string: ["apple"],
    optionalNumber: [1, 2, 3],
    notSupported: ["not-supported"],
    noSchema: ["no-schema"],
  });
});
