import { expect, test } from "vitest";
import z from "zod";
import { dredgeApi } from "../api";
import { dredgeRoute } from "../route";
import { createDirectClient } from "./direct-client";

const route = dredgeRoute();

const api = dredgeApi().routes([
  route
    .path("posts/:user")
    .params({
      user: z.enum(["dhrjarun", "dd"]),
    })
    .searchParams({
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
      return res.send({
        data: {
          say: "I am Post",
        },
        headers: {
          "Content-Type": "application/json",
        },
      });
    }),

  route
    .path("form")
    .post(
      z.object({
        name: z.string(),
        file: z.instanceof(Blob),
      }),
    )
    .resolve((req, res) => {
      return res.send({
        data: req.data,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    }),
]);

const client = createDirectClient(api);

test("direct-client", async () => {
  const data = await client.get("/posts").data();
  expect(data).toMatchObject({ say: "I am Post" });

  const response = await client.post("/posts/dhrjarun", {
    data: {
      age: 20,
    },
    searchParams: {
      size: "no-size",
    },
  });

  expect(response.data).toMatchObject({
    age: 20,
  });
});

test("formdata", async () => {
  const data = await client
    .post("/form", {
      data: {
        name: "fileName",
        file: new Blob(["good file"], {}),
      },
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    .data();

  expect(await data.file.text()).toBe("good file");
});
