import { expect, test } from "vitest";
import {
  ClientPath,
  ExtractRouteByPath,
  buildDirectClient,
  inferRoutes,
} from "./client";
import { AnyRoute, Route, createRouteBuilder } from "./route";
import { buildDredgeApi } from "./api";
import z from "zod";

let userRoute = createRouteBuilder()
  .path("user", ":username")
  .params({
    username: z.enum(["dhrjarun", "dd"]),
  })
  .searchParam({
    size: z.string(),
  })
  .get()
  .resolve(({ send, body, params, searchParams, method }) => {
    return send({
      body: [
        {
          id: "u1",
          username: "dhrjarun",
        },
      ],
    });
  });

// let postRoute = createRouteBuilder()
//   .path("posts", ":user")
//   .params({
//     user: z.enum(["dhrjarun", "dd"]),
//   })
//   .searchParam({
//     size: z.string(),
//   })
//   .post(z.string())
//   .resolve(({ send }) => {
//     return send({
//       body: [{ id: "p1", title: "Post1" }],
//     });
//   });

// let editRoute = createRouteBuilder()
//   .path("edit", ":name")
//   .params({
//     name: z.enum(["FirstName", "LastName"]),
//   })
//   .searchParam({
//     size: z.string(),
//     withHistory: z.boolean(),
//   })
//   .put(
//     z.object({
//       name: z.string(),
//     })
//   )
//   .use(({ next }) => {
//     return next();
//   })
//   .resolve(({ send }) => {
//     return send({
//       body: true,
//     });
//   });

const api = buildDredgeApi([
  createRouteBuilder()
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

  createRouteBuilder()
    .path("posts", "default")
    .post(z.number())
    .resolve(({ send, body }) => {
      return send({ body });
    }),
]);

test("client", async () => {
  const dredge = buildDirectClient(api);

  const result = await dredge.post("/posts/dhrjarun", {
    searchParams: {
      size: "20",
    },
    body: "ok body",
  });
  dredge.post("/posts/default", {
    searchParams: {},
    body: 20,
  });

  expect(result.body).toBe("ok body");

  const bodyResult = await dredge
    .post("/posts/default", {
      body: 20,
      searchParams: {},
    })
    .parsed();
  expect(bodyResult).toBe(20);
});
