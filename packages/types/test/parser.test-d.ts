import { expectTypeOf, test } from "vitest";
import { inferParserType } from "../source/parser";
import { z } from "zod";
import * as a from "arktype";
import * as v from "valibot";
import * as s from "superstruct";
import * as yup from "yup";

test("infers 'Parser' with zod", () => {
  const schema = z.literal("Parser");
  type Type = inferParserType<typeof schema>;

  expectTypeOf<Type>().toEqualTypeOf<"Parser">();
});

test("infers 'Parser' with valibot", () => {
  const schema = v.parser(v.literal("Parser"));
  type Type = inferParserType<typeof schema>;

  expectTypeOf<Type>().toEqualTypeOf<"Parser">();
});

test("infers 'Parser' with arktype", () => {
  const schema = a.type("'Parser'");
  type Schema = typeof schema;
  type Type = inferParserType<Schema>;

  expectTypeOf<Type>().toEqualTypeOf<"Parser">();
});

test("infers 'Parser' with superstruct", () => {
  const schema = s.literal("Parser");
  type Type = inferParserType<typeof schema>;

  expectTypeOf<Type>().toEqualTypeOf<"Parser">();
});

test("infers 'Parser' with yup", () => {
  const schema = yup.string().required();
  type Type = inferParserType<typeof schema>;

  expectTypeOf<Type>().toEqualTypeOf<string>();
});

test("infers 'Parser' with custom defined function", () => {
  const schema = (value: any): "Parser" => value;
  type Type = inferParserType<typeof schema>;

  expectTypeOf<Type>().toEqualTypeOf<"Parser">();
});
