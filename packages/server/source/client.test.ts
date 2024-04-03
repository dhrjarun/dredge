import { test, expect } from "vitest";
import { buildDirectClient, inferRouteUnion, inferRoutes } from "./client";
import { dredgeRoute } from "./route";
import { buildDredgeApi } from "./api";
import z from "zod";

const api = buildDredgeApi([
  dredgeRoute()
    .path("posts", ":user")
    .params({
      user: z.enum(["dhrjarun", "dd"]),
    })
    .searchParam({
      size: z.string(),
    })
    .post(z.string())
    .resolve(({ send, body }) => {
      return send({
        body,
      });
    }),

  dredgeRoute()
    .path("posts", "default")
    .post(z.number())
    .resolve(({ send, body }) => {
      return send({ body });
    }),

  dredgeRoute()
    .path("posts")
    .get()
    .resolve(({ send, body }) => {
      return send({ body });
    }),
]);

test("client", async () => {
  const dredge = buildDirectClient(api);

  dredge.get("/posts", {});

  dredge.post("/posts/default", {
    body: 20,
  });

  dredge("/posts/dd", {
    method: "post",
    body: "dd",
    searchParams: {
      size: "",
    },
  });

  const result = await dredge.post("/posts/dhrjarun", {
    searchParams: {
      size: "20",
    },
    body: "ok body",
  });
  dredge.post("/posts/default", {
    body: 20,
  });

  expect(result.body).toBe("ok body");

  const bodyResult = await dredge
    .post("/posts/default", {
      body: 20,
    })
    .parsed();
  expect(bodyResult).toBe(20);
});
