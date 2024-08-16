import { dredgeRoute, dredgeRouter } from "dredge-route";
import { afterEach, expect, test } from "vitest";
import z from "zod";
import { handleFetchRequest } from "../source/fetch";

const prefixUrl = new URL("http://localhost:4040");

test("", async () => {
  const router = dredgeRouter([
    dredgeRoute()
      .path("/user/:id")
      .get()
      .use(async (req, res) => {
        return res.end({
          data: {
            id: req.param("id"),
            name: "test-user",
            email: "test@test.com",
          },
          headers: {
            "Content-Type": "application/json",
          },
          status: 200,
        });
      })
      .build(),

    dredgeRoute()
      .options({
        dataTypes: {
          json: "application/json",
        },
      })
      .path("/user")
      .post(z.object({ id: z.string(), name: z.string(), email: z.string() }))
      .use(async (req, res) => {
        return res.end({
          json: req.data,
          status: 200,
        });
      })
      .build(),
  ]);

  const getResponse = await handleFetchRequest({
    router,
    req: new Request("http://localhost:4040/user/123", {}),
    ctx: {},
    prefixUrl: "http://localhost:4040",
    bodyParsers: {
      "application/json": async ({ text }) => {
        return JSON.parse(await text());
      },
    },
    dataSerializers: {
      "application/json": async ({ data }) => {
        return JSON.stringify(data);
      },
    },
  });

  expect(getResponse.status).toBe(200);
  expect(await getResponse.json()).toMatchObject({
    id: "123",
    name: "test-user",
    email: "test@test.com",
  });

  const postResponse = await handleFetchRequest({
    req: new Request("http://localhost:4040/user/", {
      method: "post",
      body: JSON.stringify({
        id: "123",
        name: "test-user",
        email: "test@test.com",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    }),
    router,
    ctx: {},
    prefixUrl: "http://localhost:4040",
    bodyParsers: {
      "application/json": async ({ text }) => {
        return JSON.parse(await text());
      },
    },
    dataSerializers: {
      "application/json": async ({ data }) => {
        return JSON.stringify(data);
      },
    },
  });
  expect(postResponse.status).toBe(200);
  expect(await postResponse.json()).toMatchObject({
    id: "123",
    name: "test-user",
    email: "test@test.com",
  });
});
