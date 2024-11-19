import { describe, expect, test } from "vitest";
import { dredgeRoute } from "../source/route";
import {
  useErrorMiddlewares,
  useSuccessMiddlewares,
} from "../source/route-invocation";

describe("res.up()", () => {
  test("executes all success middlewares", async () => {
    const route = dredgeRoute()
      .path("/test")
      .get()
      .use((_req, res) => {
        res.up({
          headers: {
            "Content-Type": "application/json",
          },
        });
      })
      .use((_req, res) => {
        res.up({
          status: 200,
          statusText: "ok",
        });
      })
      .use((_req, res) => {
        return res.up({
          data: "dummy-data",
        });
      });

    const response = await useSuccessMiddlewares(route)({
      method: "get",
      url: "/test",
      params: {},
      queries: {},
      headers: {},
    });

    expect(response.headers).toStrictEqual({
      "content-type": "application/json",
    });
    expect(response.status).toBe(200);
    expect(response.statusText).toBe("ok");
    expect(response.data).toBe("dummy-data");
  });
  test("executes all error middlewares", async () => {
    const route = dredgeRoute()
      .path("/test")
      .get()
      .use(() => {
        throw "any";
      })
      .error((_err, _req, res) => {
        res.up({
          headers: {
            "Content-Type": "application/json",
          },
        });
      })
      .error((_err, _req, res) => {
        res.up({
          status: 404,
          statusText: "not-found",
        });
      })
      .error((_err, _req, res) => {
        return res.up({
          data: "dummy-data",
        });
      });

    const response = await useErrorMiddlewares(route)(new Error("test-error"), {
      method: "get",
      url: "/test",
      params: {},
      queries: {},
      headers: {},
    });

    expect(response.headers).toStrictEqual({
      "content-type": "application/json",
    });
    expect(response.status).toBe(404);
    expect(response.statusText).toBe("not-found");
    expect(response.data).toBe("dummy-data");
  });
  test("deletes the header given null value", async () => {
    const route = dredgeRoute()
      .path("/test")
      .get()
      .use((_req, res) => {
        res.up({
          status: 403,
          statusText: "not-ok",
          headers: {
            "content-Type": "application/json",
          },
        });
        expect(res.header("content-type")).toBe("application/json");
        res.up({
          headers: {
            "content-type": null,
          },
        });
        expect(res.header("content-type")).toBeNull();
      })
      .error((_err, _req, res) => {
        res.up({
          headers: {
            "content-Type": "application/json",
          },
        });
        expect(res.header("content-type")).toBe("application/json");
        res.up({
          headers: {
            "content-type": null,
          },
        });
        expect(res.header("content-type")).toBeNull();
      });

    await useSuccessMiddlewares(route)({
      method: "get",
      url: "/test",
      params: {},
      queries: {},
      headers: {},
    });
    await useErrorMiddlewares(route)(new Error("test-error"), {
      method: "get",
      url: "/test",
      params: {},
      queries: {},
      headers: {},
    });
  });
  test("sets content-type header based on dataType", async () => {
    const r = dredgeRoute().options({
      dataTypes: {
        text: "text/plain;charset=utf-8",
        json: "application/json;charset=utf-8",
        form: "multipart/form-data;boundary=--DredgeBoundary4948584223",
      },
    });

    const textRoute = r
      .path("/text")
      .get()
      .use((_req, res) => {
        return res.up({
          text: "Text",
        });
      })
      .error((_err, _req, res) => {
        return res.up({
          text: "Text",
        });
      });

    const formRoute = r
      .path("/form")
      .get()
      .use((_req, res) => {
        return res.up({
          form: {
            data: "form",
          },
        });
      })
      .error((_err, _req, res) => {
        return res.up({
          form: {
            data: "form",
          },
        });
      });

    expect(
      useSuccessMiddlewares(textRoute)({
        method: "get",
        url: "/text",
        params: {},
        queries: {},
        headers: {},
      }),
    ).resolves.toMatchObject({
      headers: expect.objectContaining({
        "content-type": "text/plain;charset=utf-8",
      }),
    });

    expect(
      useSuccessMiddlewares(formRoute)({
        method: "get",
        url: "/form",
        params: {},
        queries: {},
        headers: {},
      }),
    ).resolves.toMatchObject({
      headers: expect.objectContaining({
        "content-type":
          "multipart/form-data;boundary=--DredgeBoundary4948584223",
      }),
    });

    expect(
      useErrorMiddlewares(textRoute)("test-error", {
        method: "get",
        url: "/text",
        params: {},
        queries: {},
        headers: {},
      }),
    ).resolves.toMatchObject({
      headers: expect.objectContaining({
        "content-type": "text/plain;charset=utf-8",
      }),
    });

    expect(
      useErrorMiddlewares(formRoute)("test-error", {
        method: "get",
        url: "/form",
        params: {},
        queries: {},
        headers: {},
      }),
    ).resolves.toMatchObject({
      headers: expect.objectContaining({
        "content-type":
          "multipart/form-data;boundary=--DredgeBoundary4948584223",
      }),
    });
  });
});

test("sets request dataType based on content-type header", async () => {
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
      return res.up({
        data: req.dataType,
      });
    })
    .error((_err, req, res) => {
      return res.up({
        data: req.dataType,
      });
    });

  expect(
    useSuccessMiddlewares(route)({
      method: "get",
      url: "/test",
      params: {},
      queries: {},
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
      queries: {},
      headers: {
        "content-type":
          "multipart/form-data;boundary=--DredgeBoundary4948584223",
      },
    }),
  ).resolves.toMatchObject({
    data: "formData",
  });
});

test("sets response dataType based on accept header", async () => {
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
      return res.up({
        data: res.dataType,
      });
    })
    .error((_err, _req, res) => {
      return res.up({
        data: res.dataType,
      });
    });

  expect(
    useSuccessMiddlewares(route)({
      method: "get",
      url: "/test",
      params: {},
      queries: {},
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
      queries: {},
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
      queries: {},
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
      queries: {},
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
