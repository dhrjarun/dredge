import { describe, expect, test } from "vitest";
import { dredgeRoute } from "../source/route";
import {
  useErrorMiddlewares,
  useSuccessMiddlewares,
} from "../source/route-invocation";

describe("res.next()", () => {
  test("executes all success middlewares", async () => {
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
        return res.end({
          text: "Text",
        });
      })
      .error((_err, _req, res) => {
        return res.end({
          text: "Text",
        });
      });

    const formRoute = r
      .path("/form")
      .get()
      .use((_req, res) => {
        return res.end({
          form: {
            data: "form",
          },
        });
      })
      .error((_err, _req, res) => {
        return res.end({
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

describe("res.end()", () => {
  test("skips the rest of success middlewares", async () => {
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
    expect(response.data).toBe(undefined);
  });
  test("skips the rest of error middleware", async () => {
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
    expect(response.data).toBe(undefined);
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
      return res.end({
        data: req.dataType,
      });
    })
    .error((_err, req, res) => {
      return res.end({
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
      return res.end({
        data: res.dataType,
      });
    })
    .error((_err, _req, res) => {
      return res.end({
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
