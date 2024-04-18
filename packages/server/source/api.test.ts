import { test, expect } from "vitest";
import { dredge } from "./dredge";
import z from "zod";

const { route, api } = dredge();

const testApi = api([
  route
    .path("posts", ":user")
    .params({
      user: z.enum(["dhrjarun", "dd"]),
    })
    .searchParam({
      size: z.string(),
    })
    .post(z.string())
    .resolve(({ send, data }) => {
      return send({
        data,
      });
    }),

  route
    .path("posts", "default")
    .post(z.number())
    .resolve(({ send, data }) => {
      return send({ data });
    }),

  route
    .path("posts")
    .get()
    .resolve(({ send }) => {
      return send({ data: "I am post" });
    }),
]);

test("client", async () => {
  testApi.resolveRoute("/posts", {
    method: "get",
  });

  testApi.resolveRoute("/posts", {
    method: "get",
  });

  testApi.resolveRoute("/posts/default", {
    method: "post",
    data: 20,
  });

  testApi.resolveRoute("/posts/dd", {
    method: "post",
    data: "dd",
    searchParams: {
      size: "",
    },
  });

  const result = await testApi.resolveRoute("/posts/dhrjarun", {
    method: "post",
    searchParams: {
      size: "20",
    },
    data: "ok body",
  });
  await testApi.resolveRoute("/posts/default", {
    method: "post",
    data: 20,
  });

  expect(await result.data()).toBe("ok body");

  const bodyResult = await testApi
    .resolveRoute("/posts/default", {
      method: "post",
      data: 20,
    })
    .data();
  expect(bodyResult).toBe(20);
});
