import { expect, test, describe } from "vitest";
import { Context } from "../source/context";
import { createRawContext } from "../source/utils";
import { DataTypes } from "dredge-common";

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

  test("header()", () => {
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

    expect(c.req.header()).toStrictEqual({
      "content-type": "application/json",
      "transfer-encoding": "chunked",
    });
  });

  test("header(headerName)", () => {});
});
describe("context.res", () => {});
describe("context.state", () => {});
describe("context.error", () => {});
