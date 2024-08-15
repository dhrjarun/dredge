import { createHTTPServer } from "dredge-adapters";
import { dredgeRoute, dredgeRouter } from "dredge-route";
import { afterEach, beforeEach, expect, test } from "vitest";
import { z } from "zod";
import { dredgeFetch } from "../source/dredge-fetch";

const route = dredgeRoute().options({
  dataTypes: {
    json: "application/json",
    text: "text/plain",
  },
});

const birds = [
  {
    name: "Parrot",
    color: "green",
  },
  {
    name: "Pigeon",
    color: "White",
  },
  {
    name: "Peacock",
    color: "Green",
  },
];

const events = [
  {
    date: "2022-01-01",
    title: "Event 1",
    description: "Description 1",
  },
  {
    date: "2022-01-02",
    title: "Event 2",
    description: "Description 2",
  },
  {
    date: "2022-01-03",
    title: "Event 3",
    description: "Description 3",
  },
];

function findEvent(date: string | Date) {
  let d = date instanceof Date ? date.toISOString().split("T")[0] : date;
  return events.find((event) => event.date === d);
}

function findBird(name: string) {
  return birds.find((bird) => bird.name.toLowerCase() === name.toLowerCase());
}

const router = dredgeRouter([
  route
    .path("/birds")
    .get()
    .use((req, res) => {
      return res.end({
        status: 200,
        json: birds,
      });
    })
    .build(),

  route
    .path("/birds/:name")
    .get()
    .use((req, res) => {
      return res.end({
        status: 200,
        json: findBird(req.param("name")),
      });
    })
    .build(),

  route
    .path("/events/:date")
    .params({
      date: z.date(),
    })
    .get()
    .use((req, res) => {
      return res.end({
        status: 200,
        json: findEvent(req.param("date")),
      });
    })
    .build(),
]);

let server = createHTTPServer({
  router,
  ctx: {},
  dataSerializers: {
    "application/json": async ({ data }) => {
      return JSON.stringify(data);
    },
    "text/plain": async ({ data }) => {
      if (typeof data === "string") return data;
      return "";
    },
  },
  bodyParsers: {
    "application/json": async ({ text }) => {
      const payload = await text();
      if (!payload) return;
      return JSON.parse(payload);
    },
    "text/plain": async ({ text }) => {
      const payload = await text();
      if (!payload) return;
      return payload;
    },
  },
});

let client = dredgeFetch<typeof router>().extends({
  dataTypes: {
    json: "application/json",
    text: "text/plain",
  },
  dataSerializers: {
    "application/json": async ({ data }) => {
      return JSON.stringify(data);
    },
    "text/plain": async ({ data }) => {
      if (typeof data === "string") return data;
      return "";
    },
  },
  bodyParsers: {
    "application/json": async ({ text }) => {
      const payload = await text();
      if (!payload) return;
      return JSON.parse(payload);
    },
    "text/plain": async ({ text }) => {
      const payload = await text();
      if (!payload) return;
      return payload;
    },
  },
});

beforeEach(async () => {
  await server.listen();

  client = client.extends({
    prefixUrl: `http://localhost:${(server.address() as any)?.port}`,
  });
});

afterEach(async () => {
  await server.close();
});

test("GET /birds", async () => {
  expect(await client.get("/birds").data()).toEqual(birds);
  expect(await client.get(":/birds").data()).toEqual(birds);

  expect(await client("/birds", { method: "get" }).data()).toEqual(birds);
});

test("GET /birds/:name", async () => {
  expect(await client.get("/birds/parrot").data()).toEqual(findBird("parrot"));

  expect(
    await client
      .get(":/birds/:name", {
        params: {
          name: "pigeon",
        },
      })
      .data(),
  ).toEqual(findBird("pigeon"));
});

test("GET /events/:date", async () => {
  expect(await client.get("/events/2022-01-01").data()).toEqual(
    findEvent("2022-01-01"),
  );

  expect(
    await client
      .get(":/events/:date", {
        params: {
          date: new Date("2022-01-02"),
        },
      })
      .data(),
  ).toEqual(findEvent("2022-01-02"));
});
