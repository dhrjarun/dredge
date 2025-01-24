import { expect, test } from "vitest";
import { serializeParams } from "../source/serialize-params";

test("serializeParams", () => {
  let params: any = {
    a: 1,
    b: true,
    c: new Date("2023-01-01"),
    d: "apple",
    e: false,
  };

  expect(serializeParams(params)).toStrictEqual({
    a: "1",
    b: "true",
    c: new Date("2023-01-01").toISOString(),
    d: "apple",
    e: "false",
  });

  params = {
    a: [1, 2, 3],
    b: [true, false],
    c: [new Date("2023-01-01"), new Date("2023-02-02")],
    d: ["apple"],
  };
  expect(serializeParams(params)).toStrictEqual({
    a: ["1", "2", "3"],
    b: ["true", "false"],
    c: [
      new Date("2023-01-01").toISOString(),
      new Date("2023-02-02").toISOString(),
    ],
    d: ["apple"],
  });
});
