import { describe, expect, test } from "vitest";
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
});

test("default JSON bodyParse and stringify", async () => {
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
    fetch: echoBody,
  });

  expect(await response.data()).toStrictEqual(data);
});

test("default text bodyParse and stringify", async () => {
  const data = "test";

  const _client = client.extends({
    fetch: echoBody,
  });

  const response = await _client("/test", {
    dataType: "text",
    data,
    method: "post",
    fetch: echoBody,
  });

  expect(await response.data()).toStrictEqual(data);
});

describe("dataSerializers", () => {
  let _client = client.extends({
    dataSerializers: {
      "application/json": () => {
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

  async function assertBodyText(
    received: Promise<any> | any,
    expected: string,
  ) {
    const text = await (await received).text();

    expect(text).toBe(expected);
  }
  function sendDullPostRequestAs(contentType: string) {
    return _client("/test", {
      method: "post",
      data: "any-body",
      headers: {
        "Content-Type": contentType,
      },
    });
  }

  test("serialized by `application/json`", async () => {
    await assertBodyText(
      sendDullPostRequestAs("application/json"),
      "application/json",
    );
  });

  test("serialized by `multipart/*`", async () => {
    await assertBodyText(
      sendDullPostRequestAs(
        "multipart/form-data;boundary=--DredgeBoundary73638302",
      ),
      "multipart/*",
    );
  });

  test("serialized by `text/*`", async () => {
    await assertBodyText(sendDullPostRequestAs("text/html"), "text/*");
  });

  test("serialized by `text/plain`", async () => {
    await assertBodyText(
      sendDullPostRequestAs("text/plain;charset=utf-8"),
      "text/plain",
    );
  });

  test("serialized by `*/*`", async () => {
    await assertBodyText(sendDullPostRequestAs("image/png"), "*/*");
  });

  test("argument.contentType equals content-type header in request", async () => {
    function parser(options: any) {
      return options.contentType || "";
    }
    _client = _client.extends({
      dataSerializers: {
        "application/json": parser,
        "multipart/*": parser,
        "text/*": parser,
        "text/plain": parser,
        "*/*": parser,
      },
    });

    await assertBodyText(
      sendDullPostRequestAs("application/json"),
      "application/json",
    );

    await assertBodyText(
      sendDullPostRequestAs(
        "multipart/form-data;boundary=--DredgeBoundary73638302",
      ),
      "multipart/form-data;boundary=--DredgeBoundary73638302",
    );

    await assertBodyText(
      sendDullPostRequestAs("text/plain;charset=utf-8"),
      "text/plain;charset=utf-8",
    );
    await assertBodyText(sendDullPostRequestAs("image/png"), "image/png");
  });
});

describe("bodyParsers", async () => {
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

  async function assertBodyText(
    received: Promise<any> | any,
    expected: string,
  ) {
    const text = await (await received).data();

    expect(text).toBe(expected);
  }

  function receiveResponseAs(contentType: string) {
    return _client("/test", {
      data: contentType,
      method: "post",
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  test("parsed by `application/json`", async () => {
    await assertBodyText(
      receiveResponseAs("application/json"),
      "application/json",
    );
  });

  test("parsed by `multipart/*`", async () => {
    await assertBodyText(
      receiveResponseAs(
        "multipart/form-data;boundary=--DredgeBoundary73638302",
      ),
      "multipart/*",
    );
  });

  test("parsed by `text/*`", async () => {
    await assertBodyText(receiveResponseAs("text/html"), "text/*");
  });

  test("parsed by `text/plain`", async () => {
    await assertBodyText(
      receiveResponseAs("text/plain;charset=utf-8"),
      "text/plain",
    );
  });

  test("parsed by `*/*`", async () => {
    await assertBodyText(receiveResponseAs("image/png"), "*/*");
  });

  test("argument.contentType equals content-type header in response", async () => {
    function parser(options: any) {
      return options.contentType || "";
    }
    _client = _client.extends({
      bodyParsers: {
        "application/json": parser,
        "multipart/*": parser,
        "text/*": parser,
        "text/plain": parser,
        "*/*": parser,
      },
    });

    assertBodyText(receiveResponseAs("application/json"), "application/json");

    assertBodyText(
      receiveResponseAs(
        "multipart/form-data;boundary=--DredgeBoundary73638302",
      ),
      "multipart/form-data;boundary=--DredgeBoundary73638302",
    );

    assertBodyText(receiveResponseAs("text/html"), "text/html");

    assertBodyText(
      receiveResponseAs("text/plain;charset=utf-8"),
      "text/plain;charset=utf-8",
    );
    assertBodyText(receiveResponseAs("image/png"), "image/png");
  });
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

test("serializeQueries", async () => {
  const _client = client.extends({
    serializeQueries: (params) => {
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
    queries: {
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

test.todo("default serializeParams", async () => {});

test.todo("default serializeQueries", async () => {});

test.todo(
  "update of mediaType and other params in dataSerializers",
  async () => {},
);
