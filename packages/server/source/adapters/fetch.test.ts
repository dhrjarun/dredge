import { handleFetchRequest } from "./fetch";
import { test, expect } from "vitest";
import { dredge } from "../dredge";
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
    .post(
      z.object({
        age: z.number(),
      })
    )
    .resolve(({ send, data }) => {
      return send({
        data,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }),

  route
    .path("posts")
    .get()
    .resolve(({ send }) => {
      return send({ data: "I am post" });
    }),
]);

test("handleFetchRequest", async () => {
  const baseUrl = "http://localhost:3300";
  const req = new Request(`${baseUrl}/posts/dhrjarun?size=no-size`, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ age: 20 }),
  });
  const res = await handleFetchRequest({
    req,
    api: testApi,
    ctx: {},
    prefixUrl: "http://localhost:3300",
  });

  expect(await res.json()).toMatchObject({
    age: 20,
  });
});
