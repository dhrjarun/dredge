import { createHTTPServer } from "dredge-adapters";
import { dredgeRoute, dredgeRouter } from "dredge-route";
import { afterEach, beforeEach, expect, expectTypeOf, test } from "vitest";
import { z } from "zod";
import { dredgeFetch } from "../source/dredge-fetch";

type Bird = {
  name: string;
  color: string;
};
type Fruit = {
  id: string;
  name: string;
  isFresh: boolean;
};

const route = dredgeRoute()
  .options({
    dataTypes: {
      json: "application/json",
      text: "text/plain",
    },
  })
  .error((_, d) => {
    d.status(400);
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

const fruits = [
  {
    id: "1",
    name: "Apple",
    isFresh: true,
  },
  {
    id: "2",
    name: "Orange",
    isFresh: false,
  },
];

type Event = {
  date: string;
  title: string;
  description: string;
};
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
  return events.find((event) => event.date === d)!;
}

function findBird(name: string) {
  return birds.find((bird) => bird.name.toLowerCase() === name.toLowerCase())!;
}

const GetBirds = route
  .path("/birds")
  .get()
  .use((_, d) => {
    return d.status(200).json(birds);
  });

const GetBirdByName = route
  .path("/birds/:name")
  .get()
  .use(({ req }, d) => {
    return d.status(200).json(findBird(req.param("name")));
  });

const PostBird = route
  .path("/birds")
  .post()
  .input(z.object({ name: z.string(), color: z.string() }))
  .use((_, d) => {
    return d.status(200).json({
      created: true,
    });
  });

const GetBirdColors = route
  .path("/birds/colors")
  .get()
  .use((_, d) => {
    return d.status(200).json(birds.map((bird) => bird.color));
  });

const GetEventByDate = route
  .path("/events/:date")
  .params({
    date: z.date(),
  })
  .get()
  .use(({ req }, d) => {
    return d.status(200).json(findEvent(req.param("date")));
  });

const DeleteFruitByName = route
  .path("/fruits/:name")
  .delete()
  .use((_, d) => {
    return d.status(200).json({
      isDeleted: true,
    });
  });

const GetFreshFruits = route
  .path("/fruits/fresh")
  .use((_, d) => {
    return d.status(200).json(fruits.filter((fruit) => fruit.isFresh));
  })
  .get();

const router = dredgeRouter([
  GetBirds,
  PostBird,
  GetBirdByName,
  GetEventByDate,
  GetBirdColors,
  DeleteFruitByName,
  GetFreshFruits,
]);

let server = createHTTPServer({
  router,
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
  server.listen();

  client = client.extends({
    prefixUrl: `http://localhost:${(server.address() as any)?.port}`,
  });
});

afterEach(async () => {
  server.close();
});

test("client.get /birds", async () => {
  const data = await client.get("/birds").json();

  expectTypeOf(data).toEqualTypeOf<Bird[]>();
  expect(data).toEqual(birds);
});

test("client /birds get", async () => {
  const data = await client("/birds", { method: "get" }).data();

  expectTypeOf(data).toEqualTypeOf<Bird[]>();
  expect(data).toEqual(birds);
});

test("client.post /birds", async () => {
  const data = await client
    .post("/birds", {
      json: {
        name: "Parrot",
        color: "green",
      },
    })
    .json();

  expectTypeOf(data).toEqualTypeOf<{
    created: boolean;
  }>();

  expect(data).toEqual({
    created: true,
  });
});

test("client.get /birds/pigeon", async () => {
  const data = await client.get("/birds/pigeon").data();
  expectTypeOf(data).toEqualTypeOf<Bird>();

  expect(data).toEqual(findBird("pigeon"));
});

test("client.get /birds/:name", async () => {
  const data = await client
    .get(":/birds/:name", { params: { name: "parrot" } })
    .data();

  expectTypeOf(data).toEqualTypeOf<Bird>();
  expect(data).toEqual(findBird("parrot"));
});

test("client /bird/:name get", async () => {
  const data = await client(":/birds/:name", {
    method: "get",
    params: {
      name: "parrot",
    },
  }).data();

  expectTypeOf(data).toEqualTypeOf<Bird>();
  expect(data).toEqual(findBird("parrot"));
});

test("GET /birds/colors", async () => {
  const colors = await client.get("/birds/colors").data();

  expectTypeOf(colors).toEqualTypeOf<string[]>();
  expect(colors).toEqual(birds.map((bird) => bird.color));
});

test("GET /events/:date", async () => {
  expect(await client.get("/events/2022-01-01").data()).toEqual(
    findEvent("2022-01-01"),
  );
});

test("client.get /events/:date", async () => {
  const data = await client
    .get(":/events/:date", {
      params: {
        date: new Date("2022-01-02"),
      },
    })
    .data();

  expectTypeOf(data).toEqualTypeOf<Event>();
  expect(data).toEqual(findEvent("2022-01-02"));
});

test("client.get /fruits/fresh", async () => {
  const data = await client.get("/fruits/fresh").data();

  expectTypeOf(data).toEqualTypeOf<Fruit[]>();
});

test("client.delete /fruits/:name", async () => {
  const data = await client
    .delete(":/fruits/:name", {
      params: {
        name: "Apple",
      },
    })
    .data();

  expectTypeOf(data).toEqualTypeOf<{
    isDeleted: boolean;
  }>();

  expect(data).toEqual({
    isDeleted: true,
  });
});
