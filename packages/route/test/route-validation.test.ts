import { expect, test } from "vitest";
import z from "zod";
import { dredgeRoute } from "../source/route";
import { useValidate } from "../source/route-invocation";

test("simple validation", async () => {
  const route = dredgeRoute()
    .path("/a/:string/:number/:boolean")
    .params({
      string: z.string(),
      number: z.number(),
      boolean: z.boolean(),
    })
    .queries({
      sstring: z.string(),
      snumber: z.number(),
      sboolean: z.boolean(),
    })
    .post()
    .input(z.enum(["a", "b", "c"]));

  const validated = await useValidate(route)({
    method: "POST",
    url: "",
    queries: {
      sstring: ["world"],
      snumber: [2],
      sboolean: [false],
    },
    data: "a",
    params: {
      string: "hello",
      number: 1,
      boolean: true,
    },
    headers: {},
  });

  expect(validated.params).toStrictEqual({
    string: "hello",
    number: 1,
    boolean: true,
  });

  expect(validated.queries).toStrictEqual({
    sstring: ["world"],
    snumber: [2],
    sboolean: [false],
  });
});

test("optional searchParam should work", async () => {
  const route = dredgeRoute()
    .path("/test")
    .queries({
      required: z.string(),
      optional: z.string().optional(),
    })
    .get();

  expect(
    useValidate(route)({
      method: "GET",
      url: "/test?required=i am required",
      queries: {
        required: ["i am required"],
      },
      params: {},
      headers: {},
    }),
  ).resolves.toMatchObject({
    queries: {
      required: ["i am required"],
    },
  });
});

test("unSpecified searchParam should work", async () => {
  const route = dredgeRoute()
    .path("/test")
    .queries({
      i: z.number(),
      o: z.string().optional(),
    })
    .get();

  const validated = await useValidate(route)({
    method: "GET",
    url: "/test",
    queries: {
      i: [1],
      a: ["apple"],
      b: ["ball"],
    },
    params: {},
    headers: {},
  });

  expect(validated.queries).toStrictEqual({
    i: [1],
    a: ["apple"],
    b: ["ball"],
  });
});
