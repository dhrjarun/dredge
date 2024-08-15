import { expect, test } from "vitest";
import { untypedDredgeFetch } from "../source/dredge-fetch";
import { echoBody, echoUrl } from "./helpers/fetch-implementations";

const prefixUrl = "https://a.com";
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

test("JSON bodyParse and stringify", async () => {
  const data = {
    number: 1,
    string: "test",
    boolean: true,
    array: ["a", "b", "c"],
  };

  const _client = client.extends({
    fetch: echoBody,
  });

  const response = await _client.post("/test", {
    dataType: "json",
    data,
    fetch: async (input, init) => {
      const request = new Request(input, init);
      return new Response(await request.text(), {
        status: 200,
        headers: {
          "Content-Type": request.headers.get("content-type") || "",
        },
      });
    },
  });

  expect(await response.data()).toStrictEqual(data);
});

test("dataSerializers", async () => {
  let _client = client.extends({
    dataSerializers: {
      "application/json": async ({}) => {
        return "application/json";
      },
      "multipart/*": async ({}) => {
        return "multipart/*";
      },
      "text/*": async ({}) => {
        return "text/*";
      },
      "text/plain": async ({}) => {
        return "text/plain";
      },
      "*/*": async ({}) => {
        return "*/*";
      },
    },
    fetch: echoBody,
  });

  const application_json = await _client("/test", {
    data: "",
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const multipart_ = await _client("/test", {
    data: "",
    method: "post",
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const text_plain = await _client("/test", {
    data: "",
    method: "post",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });

  const text_ = await _client("/test", {
    data: "",
    method: "post",
    headers: {
      "Content-Type": "text/html",
    },
  });

  const any = await _client("/test", {
    data: "",
    method: "post",
    headers: {
      "Content-Type": "image/png; charset=utf-8",
    },
  });

  expect(await application_json.text()).toBe("application/json");
  expect(await multipart_.text()).toBe("multipart/*");
  expect(await text_plain.text()).toBe("text/plain");
  expect(await text_.text()).toBe("text/*");
  expect(await any.text()).toBe("*/*");
});

test("bodyParsers", async () => {
  let _client = client.extends({
    bodyParsers: {
      "application/json": async ({}) => {
        return "application/json";
      },
      "multipart/*": async ({}) => {
        return "multipart/*";
      },
      "text/*": async ({}) => {
        return "text/*";
      },
      "text/plain": async ({}) => {
        return "text/plain";
      },
      "*/*": async ({}) => {
        return "*/*";
      },
    },
    fetch: async (input, init) => {
      const request = new Request(input, init);
      const body = await request.text();

      return new Response("", {
        status: 200,
        headers: {
          "Content-Type": body || request.headers.get("accept") || "",
        },
      });
    },
  });

  const application_json = await _client("/test", {
    data: "application/json",
    method: "post",
    headers: {
      "Content-Type": "text/plain",
    },
  });

  const multipart_ = await _client("/test", {
    data: "multipart/form-data; boundary=123",
    method: "post",
    headers: {
      "Content-Type": "text/plain",
    },
  });

  const text_plain = await _client("/test", {
    data: "text/plain",
    method: "post",
    headers: {
      "Content-Type": "text/plain",
    },
  });

  const text_ = await _client("/test", {
    data: "text/html",
    method: "post",
    headers: {
      "Content-Type": "text/plain",
    },
  });

  const any = await _client("/test", {
    data: "image/png",
    method: "post",
    headers: {
      "Content-Type": "text/plain",
    },
  });

  expect(await application_json.data()).toBe("application/json");
  expect(await multipart_.data()).toBe("multipart/*");
  expect(await text_plain.data()).toBe("text/plain");
  expect(await text_.data()).toBe("text/*");
  expect(await any.data()).toBe("*/*");
});

test("no content-type matches in bodyParser and dataSerializers", async () => {});

test("serializeParams", async () => {
  const _client = client.extends({
    serializeParams: (params) => {
      const newParams: Record<string, string> = {};

      Object.entries(params).forEach(([key, value]) => {
        newParams[key] = `s-${value}`;
      });

      return newParams;
    },
  });

  const response = await _client(":/test/:a/:b/:c", {
    params: {
      a: "apple",
      b: "banana",
      c: "carrot",
    },
    method: "get",
    fetch: echoUrl,
  });

  expect(await response.text()).toBe(
    "https://a.com/test/s-apple/s-banana/s-carrot",
  );
});

test("serializeSearchParams", async () => {
  const _client = client.extends({
    serializeSearchParams: (params) => {
      const newParams: Record<string, string[]> = {};
      Object.entries(params).forEach(([key, value]) => {
        newParams[key] = [];
        value.forEach((v) => {
          newParams[key]?.push(`s-${v}`);
        });
      });

      return newParams;
    },
  });
  const response = await _client(":/test", {
    searchParams: {
      a: "apple",
      b: ["banana", "ball"],
      c: "carrot",
    },
    method: "get",
    fetch: echoUrl,
  });

  const url = await response.text();
  const sp = new URL(url).searchParams;

  expect(sp.get("a")).toBe("s-apple");
  expect(sp.get("b")).toBe("s-banana");
  expect(sp.get("c")).toBe("s-carrot");
  expect(sp.getAll("b")).toStrictEqual(["s-banana", "s-ball"]);
});

test("default serializeParams", async () => {});

test("default serializeSearchParams", async () => {});

test("update of mediaType and other params in dataSerializers", async () => {});
