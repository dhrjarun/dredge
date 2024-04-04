import { test, expect } from "vitest";
import { dredgeRoute } from "./_route";
import { dredgeApi } from "./_api";
import z from "zod";

const api = dredgeApi({
  transformer: {} as any,
  routes: [
    dredgeRoute()
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

    dredgeRoute()
      .path("posts", "default")
      .post(z.number())
      .resolve(({ send, data }) => {
        return send({ data });
      }),

    dredgeRoute()
      .path("posts")
      .get()
      .resolve(({ send, data }) => {
        return send({ data });
      }),
  ],
});

test("client", async () => {
  const dredge = api.getCaller({});

  dredge.get("/posts", {});

  dredge.post("/posts/default", {
    data: 20,
  });

  dredge("/posts/dd", {
    method: "post",
    data: "dd",
    searchParams: {
      size: "",
    },
  });

  const result = await dredge.post("/posts/dhrjarun", {
    searchParams: {
      size: "20",
    },
    data: "ok body",
  });
  dredge.post("/posts/default", {
    data: 20,
  });

  expect(result.data).toBe("ok body");

  const bodyResult = await dredge
    .post("/posts/default", {
      data: 20,
    })
    .data();
  expect(bodyResult).toBe(20);
});
