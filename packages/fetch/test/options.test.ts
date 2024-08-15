import { expect, test } from "vitest";
import { untypedDredgeFetch } from "../source/dredge-fetch";
import { echoBody, echoHeaders } from "./helpers/fetch-implementations";

let prefixUrl = "https://a.com";
let client = untypedDredgeFetch().extends({
  dataTypes: {
    json: "application/json",
    form: "multipart/form-data",
    text: "text/plain",
  },
  prefixUrl,

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

test("fetch option", async () => {
  let client = untypedDredgeFetch();

  client = client.extends({
    fetch: async () => {
      return new Response("extended");
    },
  });

  expect(
    (
      await client("/test", {
        prefixUrl,
      })
    ).text(),
  ).resolves.toBe("extended");

  expect(
    (
      await client("/test", {
        fetch: async () => {
          return new Response("overridden");
        },
        prefixUrl,
      })
    ).text(),
  ).resolves.toBe("overridden");

  expect(
    (
      await untypedDredgeFetch()("/test", {
        fetch: async () => {
          return new Response("simple");
        },
        prefixUrl,
      })
    ).text(),
  ).resolves.toBe("simple");
});

test("<dataType> option sets content-type header", () => {
  client = client.extends({});

  client.post("/test", {
    dataType: "json",
    fetch: async (input, init) => {
      const request = new Request(input, init);

      expect(
        request.headers.get("content-type")?.startsWith("application/json"),
      ).toBe(true);

      return new Response();
    },
  });

  client.post("/test", {
    dataType: "form",
    fetch: async (input, init) => {
      const request = new Request(input, init);

      expect(
        request.headers.get("content-type")?.startsWith("multipart/form-data"),
      ).toBe(true);

      return new Response();
    },
  });
});

test("<dataType> method on response promise set accept header", async () => {
  let client = untypedDredgeFetch().extends({
    dataTypes: {
      json: "application/json",
    },
    bodyParsers: {
      "application/json": async ({ text }) => {
        return JSON.parse(await text());
      },
    },
    fetch: echoHeaders,
  });

  const headers = await (
    await client("/test", {
      prefixUrl,
      responseDataType: "json",
      fetch: echoHeaders,
    })
  ).json();

  expect(headers["accept"]).toBe("application/json");
  expect(
    await (client("/test", { prefixUrl, fetch: echoHeaders }) as any).json(),
  ).property("accept", "application/json");
});
