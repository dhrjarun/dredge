import { expect, test } from "vitest";
import { D } from "../source/d";
import { RawContext } from "../source/context";
import { DataTypes } from "dredge-common";
import { createRawContext } from "../source/utils";

test("updates options.status", () => {
  const context = createRawContext({});
  const d = new D(context, () => {});

  d.status(200, "OK");
  expect(context.response.status).toBe(200);
  expect(context.response.statusText).toBe("OK");
});

test("updates options.data", () => {
  const context = createRawContext({});
  const d = new D(context, () => {});

  d.data("hello");
  expect(context.response.data).toBe("hello");
});

test("updates response.data and response.dataType", () => {
  const context = createRawContext({
    response: {
      data: "hello",
      dataType: "text",
    },
    dataTypes: new DataTypes({
      text: "text/plain;charset=utf-8",
      json: "application/json;charset=utf-8",
      form: "multipart/form-data;boundary=--DredgeBoundary4948584223",
    }),
  });
  const d = new D(context, () => {}) as any;

  d.json({
    hello: "world",
  });

  expect(context.response.data).toStrictEqual({ hello: "world" });
  expect(context.response.dataType).toBe("json");
});

test("updates response.dataType", () => {
  const context = createRawContext({
    dataTypes: new DataTypes({
      text: "text/plain;charset=utf-8",
      json: "application/json;charset=utf-8",
      form: "multipart/form-data;boundary=--DredgeBoundary4948584223",
    }),
  });
  const d = new D(context, () => {});

  d.dataType("text");
  expect(context.response.dataType).toBe("text");
});

test("updates state", () => {
  const context = createRawContext({});
  const d = new D(context, () => {});

  d.state({
    session: {
      user: "dhrjarun",
    },
  });

  expect(context.state.session).toBeTruthy();
});

test("updates response.headers", () => {
  const context = createRawContext({
    response: {
      headers: {
        "content-type": "multipart/form-data",
        "transfer-encoding": "chunked",
      },
    },
  });
  const d = new D(context, () => {});

  d.header("content-type", "text/plain");
  expect(context.response.headers["content-type"]).toBe("text/plain");

  d.header({
    "content-length": "100",
    Connection: "keep-alive",
    Server: "Dredge",
  });

  expect(context.response.headers).toStrictEqual({
    "content-type": "text/plain",
    "content-length": "100",
    connection: "keep-alive",
    server: "Dredge",
    "transfer-encoding": "chunked",
  });
});

test("deletes the header given `null | undefined | ''` value", async () => {
  const context: RawContext = createRawContext({});
  const d = new D(context, () => {});

  d.header("content-type", "application/json");
  expect(context.response.headers["content-type"]).toBe("application/json");

  d.header("content-type", null);
  expect(context.response.headers["content-type"]).toBeUndefined();
});

test("updates response.dataType when updating content-type header", () => {
  const context = createRawContext({
    dataTypes: new DataTypes({
      text: "text/plain;charset=utf-8",
      json: "application/json;charset=utf-8",
      form: "multipart/form-data;boundary=--DredgeBoundary4948584223",
    }),
  });
  const d = new D(context, () => {});

  d.header("content-type", "application/json");
  expect(context.response.dataType).toBe("json");

  d.header("content-type", "text/plain");
  expect(context.response.dataType).toBe("text");

  d.header("content-type", "multipart/form-data;boundary=--1234");
  expect(context.response.dataType).toBe("form");
});

test("updates content-type header when updating dataType", async () => {
  const context: RawContext = createRawContext({
    dataTypes: new DataTypes({
      text: "text/plain;charset=utf-8",
      json: "application/json;charset=utf-8",
      form: "multipart/form-data;boundary=--DredgeBoundary4948584223",
    }),
  });

  const d = new D(context, () => {});

  d.dataType("text");
  expect(context.response.dataType).toBe("text");
  expect(context.response.headers["content-type"]).toBe(
    "text/plain;charset=utf-8",
  );

  d.dataType("json");
  expect(context.response.dataType).toBe("json");
  expect(context.response.headers["content-type"]).toBe(
    "application/json;charset=utf-8",
  );

  d.dataType("form");
  expect(context.response.dataType).toBe("form");
  expect(context.response.headers["content-type"]).toBe(
    "multipart/form-data;boundary=--DredgeBoundary4948584223",
  );
});

test("sets request.dataType based on content-type header", async () => {
  const jsonC = createRawContext({
    request: {
      headers: {
        "content-type": "application/json",
      },
    },
    dataTypes: new DataTypes({
      json: "application/json",
      form: "multipart/form-data",
    }),
  });
  new D(jsonC, () => {});
  expect(jsonC.request.dataType).toBe("json");

  const formC = createRawContext({
    request: {
      headers: {
        "content-type": "multipart/form-data",
      },
    },
    dataTypes: new DataTypes({
      json: "application/json",
      form: "multipart/form-data",
    }),
  });
  new D(formC, () => {});
  expect(formC.request.dataType).toBe("form");
});

test("sets response.dataType based on request accept header", async () => {
  const jsonC = createRawContext({
    request: {
      headers: {
        accept: "application/json",
      },
    },
    dataTypes: new DataTypes({
      json: "application/json",
      form: "multipart/form-data",
    }),
  });
  new D(jsonC, () => {});

  expect(jsonC.response.dataType).toBe("json");

  const formC = createRawContext({
    request: {
      headers: {
        accept: "multipart/form-data",
      },
    },
    dataTypes: new DataTypes({
      json: "application/json",
      form: "multipart/form-data",
    }),
  });
  new D(formC, () => {});
  expect(formC.response.dataType).toBe("form");
});
