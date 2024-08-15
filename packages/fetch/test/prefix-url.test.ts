import { expect, test } from "vitest";
import { untypedDredgeFetch } from "../source/dredge-fetch";
import { echoUrl } from "./helpers/fetch-implementations";
import { client, prefixUrl } from "./helpers/untyped-client";

test("Rejects if prefixUrl is not provided", () => {
  expect(untypedDredgeFetch().get("/test")).rejects.toThrowError(/prefix/i);

  expect(
    client
      .extends({
        prefixUrl: "https://a.com",
        fetch: async () => {
          return new Response("test");
        },
      })
      .post("/test"),
  ).resolves.toBeDefined();

  expect(
    untypedDredgeFetch().post("/test", {
      prefixUrl: "https://a.com",
      fetch: async () => {
        return new Response("test");
      },
    }),
  ).resolves.toBeDefined();
});

test("Reject if prefixUrl is invalid", () => {
  expect(
    untypedDredgeFetch().get("/test", {
      prefixUrl: "in",
    }),
  ).rejects.toThrowError();
});

test("prefixUrl", async () => {
  const extended = untypedDredgeFetch().extends({
    prefixUrl: "https://extended.com",
    fetch: echoUrl,
  });

  expect(await (await extended.get("/test")).text()).toBe(
    "https://extended.com/test",
  );

  expect(
    await (
      await extended.get("/test", {
        prefixUrl: "https://overriden.com",
      })
    ).text(),
  ).toBe("https://overriden.com/test");

  expect(
    await (
      await client("/test", {
        fetch: echoUrl,
        prefixUrl: "https://a.com",
      })
    ).text(),
  ).toBe("https://a.com/test");

  expect(
    await (
      await client("/test", {
        fetch: echoUrl,
        prefixUrl: "https://a.com/base",
      })
    ).text(),
  ).toBe("https://a.com/base/test");

  expect(
    await (
      await client("/test", {
        fetch: echoUrl,
        prefixUrl: "https://a.com/base/",
      })
    ).text(),
  ).toBe("https://a.com/base/test");
});
