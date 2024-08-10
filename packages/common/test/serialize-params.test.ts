import { expect, test } from "vitest";
import {
  serializeParams,
  serializeSearchParams,
} from "../source/serialize-params";

test("serializeSearchParams", () => {
  const searchParams = {
    a: [1, 2, 3],
    b: [true, false],
    c: [new Date("2023-01-01"), new Date("2023-02-02")],
    d: ["apple"],
  };

  const result = serializeSearchParams(searchParams);

  expect(result).toStrictEqual({
    a: ["1", "2", "3"],
    b: ["true", "false"],
    c: [
      new Date("2023-01-01").toISOString(),
      new Date("2023-02-02").toISOString(),
    ],
    d: ["apple"],
  });
});

test("serializeParams", () => {
  const params = {
    a: 1,
    b: true,
    c: new Date("2023-01-01"),
    d: "apple",
    e: false,
  };

  const result = serializeParams(params);

  expect(result).toStrictEqual({
    a: "1",
    b: "true",
    c: new Date("2023-01-01").toISOString(),
    d: "apple",
    e: "false",
  });
});
