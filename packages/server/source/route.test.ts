import { expect, test } from "vitest";
import z from "zod";
import { createRouteBuilder } from "./route";

test("route", () => {
  let postRoute = createRouteBuilder()
    .path("posts/:user")
    .path("top-of-the-world/:t")
    .params({
      user: z.enum(["dhrjarun", "dd"]),
    })
    .params({
      t: z.string(),
    })
    .searchParam({
      size: z.string(),
    })
    .post(z.string())
    .resolve((req, res) => {
      return res.send({
        data: [{ id: "p1", title: "Post1" }],
      });
    });

  const def = postRoute._def;

  expect(def.paths).toEqual(["posts", ":user", "top-of-the-world", ":t"]);
  expect(def.params).toStrictEqual({
    user: expect.anything(),
    t: expect.anything(),
  });
  expect(def.method).toBe("post");
});

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
