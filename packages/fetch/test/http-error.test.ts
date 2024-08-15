import { expect, test } from "vitest";
import { client, prefixUrl } from "./helpers/untyped-client";

test("Throw HTTPError if response status is not 2xx", async () => {
  expect(
    client.get("/test", {
      prefixUrl,
      fetch: async () => {
        return new Response("test", {
          status: 400,
        });
      },
    }),
  ).rejects.toThrowError(/400/);

  expect(
    client.get("/test", {
      prefixUrl,
      fetch: async () => {
        return new Response("test", {
          status: 500,
        });
      },
      throwHttpErrors: true,
    }),
  ).rejects.toThrowError(/500/);

  expect(
    client.get("/test", {
      prefixUrl,
      fetch: async () => {
        return new Response("test", {
          status: 300,
        });
      },
    }),
  ).rejects.toThrowError(/300/);

  expect(
    client.get("/test", {
      prefixUrl,
      fetch: async () => {
        return new Response("test", {
          status: 399,
        });
      },
    }),
  ).rejects.toThrowError(/399/);
});

test("Do not throw HTTPError if response status is 2xx", async () => {
  expect(
    client.get("/test", {
      prefixUrl,
      fetch: async () => {
        return new Response("test", {
          status: 200,
        });
      },
      throwHttpErrors: true,
    }),
  ).resolves.toBeDefined();

  expect(
    client.get("/test", {
      prefixUrl,
      fetch: async () => {
        return new Response("test", {
          status: 201,
        });
      },
      throwHttpErrors: true,
    }),
  ).resolves.toBeDefined();

  expect(
    client.get("/test", {
      prefixUrl,
      fetch: async () => {
        return new Response("test", {
          status: 299,
        });
      },
    }),
  ).resolves.toBeDefined();
});

test("Do not throw HTTPError if throwHttpErrors is false", async () => {
  expect(
    client.get("/test", {
      prefixUrl,
      fetch: async () => {
        return new Response("test", {
          status: 400,
        });
      },
      throwHttpErrors: false,
    }),
  ).resolves.toBeDefined();

  expect(
    client.get("/test", {
      prefixUrl,
      fetch: async () => {
        return new Response("test", {
          status: 500,
        });
      },
      throwHttpErrors: false,
    }),
  ).resolves.toBeDefined();

  expect(
    client.get("/test", {
      prefixUrl,
      fetch: async () => {
        return new Response("test", {
          status: 300,
        });
      },
      throwHttpErrors: false,
    }),
  ).resolves.toBeDefined();

  expect(
    client.get("/test", {
      prefixUrl,
      fetch: async () => {
        return new Response("test", {
          status: 200,
        });
      },
      throwHttpErrors: false,
    }),
  ).resolves.toBeDefined();
});
