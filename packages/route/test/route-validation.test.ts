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
    .searchParams({
      sstring: z.string(),
      snumber: z.number(),
      sboolean: z.boolean(),
    })
    .post(z.enum(["a", "b", "c"]))
    .build();

  const validated = await useValidate(route)({
    method: "POST",
    url: "",
    searchParams: {
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

  expect(validated.searchParams).toStrictEqual({
    sstring: ["world"],
    snumber: [2],
    sboolean: [false],
  });
});

test("optional searchParam should work", async () => {
  const route = dredgeRoute()
    .path("/test")
    .searchParams({
      required: z.string(),
      optional: z.string().optional(),
    })
    .get()
    .build();

  expect(
    useValidate(route)({
      method: "GET",
      url: "/test?required=i am required",
      searchParams: {
        required: ["i am required"],
      },
      params: {},
      headers: {},
    }),
  ).resolves.toMatchObject({
    searchParams: {
      required: ["i am required"],
    },
  });
});

test("unSpecified searchParam should work", async () => {
  const route = dredgeRoute()
    .path("/test")
    .searchParams({
      i: z.number(),
      o: z.string().optional(),
    })
    .get()
    .build();

  const validated = await useValidate(route)({
    method: "GET",
    url: "/test",
    searchParams: {
      i: [1],
      a: ["apple"],
      b: ["ball"],
    },
    params: {},
    headers: {},
  });

  expect(validated.searchParams).toStrictEqual({
    i: [1],
    a: ["apple"],
    b: ["ball"],
  });
});
