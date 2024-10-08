import { expect, test } from "vitest";
import { dredgeRoute } from "../source/route";
import {
  useErrorMiddlewares,
  useSuccessMiddlewares,
} from "../source/route-invocation";

test("all success middleware should run", async () => {
  const route = dredgeRoute()
    .path("/test")
    .get()
    .use((_req, res) => {
      return res.next({
        headers: {
          "Content-Type": "application/json",
        },
      });
    })
    .use((_req, res) => {
      return res.next({
        status: 200,
        statusText: "ok",
      });
    })
    .use((_req, res) => {
      return res.next({
        data: "dummy-data",
      });
    })
    .build();

  const response = await useSuccessMiddlewares(route)({
    method: "get",
    url: "/test",
    params: {},
    searchParams: {},
    headers: {},
  });

  expect(response.headers).toStrictEqual({
    "content-type": "application/json",
  });
  expect(response.status).toBe(200);
  expect(response.statusText).toBe("ok");
  expect(response.data).toBe("dummy-data");
});

test("all error middleware should run", async () => {
  const route = dredgeRoute()
    .path("/test")
    .get()
    .use(() => {
      throw "any";
    })
    .error((_err, _req, res) => {
      return res.next({
        headers: {
          "Content-Type": "application/json",
        },
      });
    })
    .error((_err, _req, res) => {
      return res.next({
        status: 404,
        statusText: "not-found",
      });
    })
    .error((_err, _req, res) => {
      return res.next({
        data: "dummy-data",
      });
    })
    .build();

  const response = await useErrorMiddlewares(route)(new Error("test-error"), {
    method: "get",
    url: "/test",
    params: {},
    searchParams: {},
    headers: {},
  });

  expect(response.headers).toStrictEqual({
    "content-type": "application/json",
  });
  expect(response.status).toBe(404);
  expect(response.statusText).toBe("not-found");
  expect(response.data).toBe("dummy-data");
});

test("res.end() function should skip the rest of the success middleware", async () => {
  const route = dredgeRoute()
    .path("/test")
    .get()
    .use((_req, res) => {
      return res.next({
        headers: {
          "Content-Type": "application/json",
        },
      });
    })
    .use((_req, res) => {
      return res.end({
        status: 200,
        statusText: "ok",
      });
    })
    .use((_req, res) => {
      return res.next({
        data: "dummy-data",
        status: 201,
        statusText: "created",
      });
    })
    .build();

  const response = await useSuccessMiddlewares(route)({
    method: "get",
    url: "/test",
    params: {},
    searchParams: {},
    headers: {},
  });

  expect(response.headers).toStrictEqual({
    "content-type": "application/json",
  });
  expect(response.status).toBe(200);
  expect(response.statusText).toBe("ok");
  expect(response.data).toBe(undefined);
});

test("res.end() function should skip the rest of the error middleware", async () => {
  const route = dredgeRoute()
    .path("/test")
    .get()
    .use(() => {
      throw "any";
    })
    .error((_err, _req, res) => {
      return res.next({
        headers: {
          "Content-Type": "application/json",
        },
      });
    })
    .error((_err, _req, res) => {
      return res.end({
        status: 404,
        statusText: "not-found",
      });
    })
    .error((_err, _req, res) => {
      return res.next({
        data: "dummy-data",
        status: 400,
        statusText: "bad-data",
      });
    })
    .build();

  const response = await useErrorMiddlewares(route)(new Error("test-error"), {
    method: "get",
    url: "/test",
    params: {},
    searchParams: {},
    headers: {},
  });

  expect(response.headers).toStrictEqual({
    "content-type": "application/json",
  });
  expect(response.status).toBe(404);
  expect(response.statusText).toBe("not-found");
  expect(response.data).toBe(undefined);
});

test("if headerValue for some header is provide null, it should be deleted", async () => {
  const route = dredgeRoute()
    .path("/test")
    .get()
    .use((_req, res) => {
      return res.next({
        headers: {
          "content-Type": "application/json",
        },
      });
    })
    .use((_req, res) => {
      expect(res.header("content-type")).toBe("application/json");
    })
    .use((_req, res) => {
      return res.next({
        headers: {
          "content-type": null,
        },
      });
    })
    .use((_req, res) => {
      expect(res.header("content-type")).toBeNull();
    })
    .error((_err, _req, res) => {
      return res.next({
        headers: {
          "content-Type": "application/json",
        },
      });
    })
    .error((_err, _req, res) => {
      expect(res.header("content-type")).toBe("application/json");
    })
    .build();

  await useSuccessMiddlewares(route)({
    method: "get",
    url: "/test",
    params: {},
    searchParams: {},
    headers: {},
  });
  await useErrorMiddlewares(route)(new Error("test-error"), {
    method: "get",
    url: "/test",
    params: {},
    searchParams: {},
    headers: {},
  });
});

test("content-type header should set corresponding request dataType", async () => {
  const route = dredgeRoute()
    .options({
      dataTypes: {
        json: "application/json",
        formData: "multipart/form-data",
      },
    })
    .path("/test")
    .get()
    .use((req, res) => {
      return res.end({
        data: req.dataType,
      });
    })
    .error((_err, req, res) => {
      return res.end({
        data: req.dataType,
      });
    })
    .build();

  expect(
    useSuccessMiddlewares(route)({
      method: "get",
      url: "/test",
      params: {},
      searchParams: {},
      headers: {
        "content-type": "application/json",
      },
    }),
  ).resolves.toMatchObject({
    data: "json",
  });

  expect(
    useErrorMiddlewares(route)("test-error", {
      method: "get",
      url: "/test",
      params: {},
      searchParams: {},
      headers: {
        "content-type":
          "multipart/form-data;boundary=--DredgeBoundary4948584223",
      },
    }),
  ).resolves.toMatchObject({
    data: "formData",
  });
});

test("accept header should set corresponding response dataType and it set corresponding content-type in response header", async () => {
  const route = dredgeRoute()
    .options({
      dataTypes: {
        json: "application/json",
        formData: "multipart/form-data",
      },
    })
    .path("/test")
    .get()
    .use((_req, res) => {
      return res.end({
        data: res.dataType,
      });
    })
    .error((_err, _req, res) => {
      return res.end({
        data: res.dataType,
      });
    })
    .build();

  expect(
    useSuccessMiddlewares(route)({
      method: "get",
      url: "/test",
      params: {},
      searchParams: {},
      headers: {
        accept: "application/json",
      },
    }),
  ).resolves.toMatchObject({
    data: "json",
    headers: expect.objectContaining({
      "content-type": "application/json",
    }),
  });

  expect(
    useSuccessMiddlewares(route)({
      method: "get",
      url: "/test",
      params: {},
      searchParams: {},
      headers: {
        accept: "application/json",
      },
    }),
  ).resolves.toMatchObject({
    data: "json",
    headers: expect.objectContaining({
      "content-type": "application/json",
    }),
  });

  expect(
    useSuccessMiddlewares(route)({
      method: "get",
      url: "/test",
      params: {},
      searchParams: {},
      headers: {
        accept: "multipart/form-data",
      },
    }),
  ).resolves.toMatchObject({
    data: "formData",
    headers: expect.objectContaining({
      "content-type": "multipart/form-data",
    }),
  });

  expect(
    useErrorMiddlewares(route)("test-error", {
      method: "get",
      url: "/test",
      params: {},
      searchParams: {},
      headers: {
        accept: "multipart/form-data",
      },
    }),
  ).resolves.toMatchObject({
    data: "formData",
    headers: expect.objectContaining({
      "content-type": "multipart/form-data",
    }),
  });
});
