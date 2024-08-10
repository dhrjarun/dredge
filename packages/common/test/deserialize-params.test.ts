import { expect, test } from "vitest";
import { z } from "zod";
import {
  deserializeParams,
  deserializeSearchParams,
} from "../source/deserialize-params";

test("deserializeSearchParams", () => {
  const searchParams = {
    a: ["1", "2", "3"],
    b: ["true", "false"],
    c: ["2023-01-01", "2023-02-02"],
    d: ["apple"],
  };

  const schema = {
    a: z.number(),
    b: z.boolean(),
    c: z.date(),
    d: z.string(),
  };

  const result = deserializeSearchParams(searchParams, schema);

  expect(result).toStrictEqual({
    a: [1, 2, 3],
    b: [true, false],
    c: [expect.any(Date), expect.any(Date)],
    d: ["apple"],
  });
});

test("deserializeParams", () => {
  const params = {
    a: "1",
    b: "true",
    c: "2023-01-01",
    d: "apple",
  };

  const schema = {
    a: z.number(),
    b: z.boolean(),
    c: z.date(),
    d: z.string(),
  };

  const result = deserializeParams(params, schema);

  expect(result).toStrictEqual({
    a: 1,
    b: true,
    c: expect.any(Date),
    d: "apple",
  });
});
