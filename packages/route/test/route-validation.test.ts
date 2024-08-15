import { expect, test } from "vitest";
import z from "zod";
import { dredgeRoute } from "../source/route";
import { useValidate } from "../source/route-invocation";

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
  const route = dredgeRoute().path("/test").searchParams({}).get().build();

  expect(
    useValidate(route)({
      method: "GET",
      url: "/test",
      searchParams: {
        a: ["apple"],
      },
      params: {},
      headers: {},
    }),
  ).resolves.toMatchObject({
    searchParams: {},
  });
});
