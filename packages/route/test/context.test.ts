import { DataTypes } from "dredge-common";
import { describe, expect, test } from "vitest";
import { Context } from "../source/context";
import { createRawContext } from "../source/utils";

describe("context.req", () => {
  test("method", () => {
    const context = createRawContext({
      request: {
        method: "get",
      },
    });
    const c = new Context(context);

    expect(c.req.method).toBe("get");
    context.request.method = "post";
    expect(c.req.method).toBe("post");
  });
  test("url", () => {
    const context = createRawContext({
      request: {
        url: "/test",
      },
    });
    const c = new Context(context);

    expect(c.req.url).toBe("/test");
    context.request.url = "/test/123";
    expect(c.req.url).toBe("/test/123");
  });
  test("dataType", () => {
    const context = createRawContext({
      request: {
        dataType: "json",
      },
    });
    const c = new Context(context);

    expect(c.req.dataType).toBe("json");
    context.request.dataType = "form";
    expect(c.req.dataType).toBe("form");
  });

  test("data", () => {
    const context = createRawContext({
      request: {
        data: {
          hello: "world",
        },
      },
    });
    const c = new Context(context);

    expect(c.req.data).toStrictEqual({
      hello: "world",
    });
    context.request.data = {
      hello: "world",
      goodbye: "world",
    };
    expect(c.req.data).toStrictEqual({
      hello: "world",
      goodbye: "world",
    });
  });

  test("param()", () => {
    const context = createRawContext({
      request: {
        params: {
          a: "apple",
          b: ["ball", "bat"],
          c: ["cat", "dog"],
          d: "donkey",
        },
      },
    });
    const c = new Context(context);

    expect(c.req.params).toStrictEqual({
      a: "apple",
      b: ["ball", "bat"],
      c: ["cat", "dog"],
      d: "donkey",
    });

    expect(c.req.params.a).toBe("apple");
    expect(c.req.params.b).toStrictEqual(["ball", "bat"]);
    expect(c.req.params.c).toStrictEqual(["cat", "dog"]);
    expect(c.req.params.d).toBe("donkey");
  });

  test("headers", () => {
    const context = createRawContext({
      request: {
        headers: {
          "content-type": "application/json",
          "transfer-encoding": "chunked",
        },
      },
      dataTypes: new DataTypes({
        json: "application/json",
        form: "multipart/form-data",
      }),
    });
    const c = new Context(context);

    expect(c.req.headers).toStrictEqual({
      "content-type": "application/json",
      "transfer-encoding": "chunked",
    });
  });

  test("header(headerName)", () => {
    const context = createRawContext({
      request: {
        headers: {
          "content-type": "application/json",
          "transfer-encoding": "chunked",
        },
      },
      dataTypes: new DataTypes({
        json: "application/json",
        form: "multipart/form-data",
      }),
    });
    const c = new Context(context);

    expect(c.req.headers["content-type"]).toBe("application/json");
    expect(c.req.headers["transfer-encoding"]).toBe("chunked");
  });
});

describe("context.res", () => {
  test("status", () => {
    const context = createRawContext({
      response: {
        status: 200,
      },
    });
    const c = new Context(context);

    expect(c.res.status).toBe(200);
    context.response.status = 404;
    expect(c.res.status).toBe(404);
  });

  test("statusText", () => {
    const context = createRawContext({
      response: {
        statusText: "ok",
      },
    });
    const c = new Context(context);

    expect(c.res.statusText).toBe("ok");
    context.response.statusText = "not-ok";
    expect(c.res.statusText).toBe("not-ok");
  });

  test("dataType", () => {
    const context = createRawContext({
      response: {
        dataType: "json",
      },
    });
    const c = new Context(context);

    expect(c.res.dataType).toBe("json");
    context.response.dataType = "form";
    expect(c.res.dataType).toBe("form");
  });

  test("data", () => {
    const context = createRawContext({
      response: {
        data: {
          hello: "world",
        },
      },
    });
    const c = new Context(context);

    expect(c.res.data).toStrictEqual({
      hello: "world",
    });
    context.response.data = {
      hello: "world",
      goodbye: "world",
    };
    expect(c.res.data).toStrictEqual({
      hello: "world",
      goodbye: "world",
    });
  });

  test("headers", () => {
    const context = createRawContext({
      response: {
        headers: {
          "content-type": "application/json",
          "transfer-encoding": "chunked",
        },
      },
      dataTypes: new DataTypes({
        json: "application/json",
        form: "multipart/form-data",
      }),
    });
    const c = new Context(context);

    expect(c.res.headers["content-type"]).toBe("application/json");
    expect(c.res.headers["transfer-encoding"]).toBe("chunked");

    expect(c.res.headers).toStrictEqual({
      "content-type": "application/json",
      "transfer-encoding": "chunked",
    });
  });
});

test("context.state", () => {
  const context = createRawContext({
    state: {
      hello: "world",
    },
  });
  const c = new Context(context);

  expect(c.state.hello).toBe("world");
  context.state.hello = "world";
  expect(c.state.hello).toBe("world");
});

test("context.error", () => {
  const error = new Error("test");
  const context = createRawContext({
    error,
  });
  const c = new Context(context);

  expect(c.error).toBe(error);
  context.error = undefined;
  expect(c.error).toBe(undefined);
});
