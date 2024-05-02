import { expect, test } from "vitest";
import z from "zod";
import { dredge } from "../dredge";
import { handleFetchRequest } from "./fetch";

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
      }),
    )
    .resolve((req, res) => {
      return res.send({
        data: req.data,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }),

  route
    .path("posts")
    .get()
    .resolve((req, res) => {
      return res.send({ data: "I am post" });
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
