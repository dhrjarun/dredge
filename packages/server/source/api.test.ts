import { expect, test } from "vitest";
import z from "zod";
import { dredge } from "./dredge";

const { route, api } = dredge();

const testApi = api([
  route
    .path("posts/:user")
    .params({
      user: z.enum(["dhrjarun", "dd"]),
    })
    .searchParam({
      size: z.string(),
    })
    .post(z.string())
    .resolve((req, res) => {
      return res.send({
        data: req.data,
      });
    }),

  route
    .path("posts/default")
    .post(z.number())
    .resolve((req, res) => {
      return res.send({ data: req.data });
    }),

  route
    .path("posts")
    .get()
    .resolve((req, res) => {
      return res.send({ data: "I am post" });
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
