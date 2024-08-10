import { dredgeRoute, dredgeRouter } from "dredge-route";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { createDirectClient, directClient } from "../source/direct-client";

const route = dredgeRoute();
const dataTypes = {
  json: "application/json",
  form: "multipart/form-data",
};

describe("client.extend", () => {
  const route = dredgeRoute<any>();

  let client = directClient(
    dredgeRouter([
      route
        .options({
          dataTypes,
        })
        .path("/test")
        .post(z.any())
        .use((req, res) => {
          return res.end({
            data: {
              headers: req.header(),
              dataType: req.dataType,
              ctx: res.ctx,
              url: req.url,
              responseDataType: res.dataType,
            },
            status: 200,
            statusText: "ok",
          });
        })
        .build(),
    ]),
  );

  let unTypedClient = createDirectClient(
    dredgeRouter([
      route
        .options({
          dataTypes,
        })
        .path("/test")
        .post(z.any())
        .use((req, res) => {
          return res.end({
            data: {
              headers: req.header(),
              dataType: req.dataType,
              ctx: res.ctx,
              url: req.url,
              responseDataType: res.dataType,
            },
            status: 200,
            statusText: "ok",
          });
        })
        .build(),
    ]),
  );

  client = client.extends({
    dataTypes,
  });

  test("extend of dataTypes", async () => {
    expect(
      await client
        .post("/test", {
          dataType: "form",
        })
        .data(),
    ).toMatchObject({
      dataType: "form",
    });

    client = client.extends({
      dataTypes,
    });

    expect(
      await client
        .post("/test", {
          dataType: "json",
        })
        .data(),
    ).toMatchObject({
      dataType: "json",
    });
  });

  test("extend of ctx", async () => {
    client = client.extends({
      serverCtx: {
        db: "fake-db",
        session: "1",
      },
    });

    expect(await client.post("/test").data()).toMatchObject({
      ctx: {
        db: "fake-db",
        session: "1",
      },
    });

    client = client.extends({
      serverCtx: {
        db: "dummy-db",
      },
    });
    expect(await client.post("/test").data()).toMatchObject({
      ctx: {
        db: "dummy-db",
      },
    });
  });

  test("extend of headers", async () => {
    client = client.extends({
      headers: {
        "accept-language": "en",
        Referer: "https://dredge.io",
      },
    });

    expect(
      await client
        .post("/test", {
          headers: {
            "Accept-Encoding": "gzip, deflate, br",
            Referer: "https://dredge.com",
          },
        })
        .data(),
    ).toMatchObject({
      headers: expect.objectContaining({
        "accept-language": "en",
        "accept-encoding": "gzip, deflate, br",
        referer: "https://dredge.com",
      }),
    });

    client = client.extends({
      headers: {
        Connection: "keep-alive",
      },
    });
    expect(await client.post(":/test").data()).toMatchObject({
      headers: {
        "accept-language": "en",
        referer: "https://dredge.io",
        connection: "keep-alive",
      },
    });
  });

  test("extend of prefixUrl", async () => {
    client = client.extends({
      prefixUrl: "https://dredge.com",
    });

    expect(
      await client
        .post("/test", {
          data: {},
        })
        .data(),
    ).toMatchObject({
      url: "https://dredge.com/test",
    });
  });
});

// test("paramPath should work", async () => {
//   const client = directClient(
//     dredgeRouter([
//       route
//         .path("/test/:PI/:PII")
//         .get()
//         .use((req, res) => {
//           return res.end({
//             data: {
//               path: req.url,
//             },
//             status: 200,
//             statusText: "ok",
//           });
//         })
//         .build(),
//     ]),
//   );

//   expect(
//     await client
//       .get(":/test/:PI/:PII", {
//         params: {
//           PI: "a",
//           PII: "b",
//         },
//       })
//       .data(),
//   ).toStrictEqual({
//     path: "/test/a/b",
//   });

//   const response = await client(":/test/:PI/:PII", {
//     method: "get",
//     params: {
//       PI: "a",
//       PII: "b",
//     },
//   });

//   expect(await response.data()).toStrictEqual({
//     path: "/test/a/b",
//   });
// });

// test("throw error if params is empty string", () => {
//   const client = directClient(
//     dredgeRouter([
//       route
//         .path("/test/:PI/:PII")
//         .get()
//         .use((req, res) => {
//           return res.end({
//             data: {
//               path: req.url,
//             },
//             status: 200,
//             statusText: "ok",
//           });
//         })
//         .build(),
//     ]),
//   );

//   expect(() => {
//     client.get(":/test/:PI/:PII", {
//       params: {
//         PI: "",
//         PII: "abc",
//       },
//     });
//   }).toThrowError();

//   expect(() => {
//     client.get(":/test/:PI/:PII", {
//       params: {
//         PI: "",
//         PII: "",
//       },
//     });
//   }).toThrowError();
// });

// describe("dataTypes", () => {
//   const route = dredgeRoute().options({
//     dataTypes: {
//       json: "application/json",
//       form: "multipart/form-data",
//     },
//   });

//   const client = directClient(
//     dredgeRouter([
//       route
//         .path("/test")
//         .post(z.any())
//         .use((req, res) => {
//           return res.end({
//             data: {
//               reqContentType: req.header("content-type"),
//               reqDataType: req.dataType,
//               reqAccept: req.header("accept"),

//               resDataType: res.dataType,
//             },
//             status: 200,
//             statusText: "ok",
//           });
//         })
//         .build(),
//     ]),
//   );

//   test("dataType options fields should work", async () => {
//     const response = await client("/test", {
//       method: "post",
//       json: {
//         info: "...",
//       },
//       dataTypes: {
//         json: "application/json",
//         form: "multipart/form-data",
//       },
//     });

//     expect(await response.data()).toMatchObject({
//       reqContentType: "application/json",
//       reqDataType: "json",
//     });

//     expect(
//       await client("/test", {
//         method: "post",
//         json: {
//           info: "...",
//         },
//         dataTypes: {
//           json: "application/json",
//           form: "multipart/form-data",
//         },
//       }).data(),
//     ).toMatchObject({
//       reqContentType: "application/json",
//       reqDataType: "json",
//     });

//     expect(
//       await client
//         .post("/test", {
//           form: {
//             info: "...",
//           },
//           dataTypes: {
//             json: "application/json",
//             form: "multipart/form-data",
//           },
//         })
//         .data(),
//     ).toMatchObject({
//       reqDataType: "form",
//       reqContentType: expect.stringMatching("multipart/form-data;boundary="),
//     });
//   });

//   test("response promise data methods should work", async () => {
//     expect(
//       await client
//         .post("/test", {
//           data: {},
//           dataTypes: {
//             json: "application/json",
//             form: "multipart/form-data",
//           },
//         })
//         .json(),
//     ).toMatchObject({
//       reqAccept: "application/json",
//       resDataType: "json",
//     });

//     expect(
//       await client
//         .post("/test", {
//           data: {},
//           dataTypes: {
//             form: "multipart/form-data",
//             json: "application/json",
//           },
//         })
//         .form(),
//     ).toMatchObject({
//       reqAccept: "multipart/form-data",
//       resDataType: "form",
//     });
//   });
// });

// test("throw error if status is not ok", async () => {
//   const client = directClient(
//     dredgeRouter([
//       dredgeRoute()
//         .path("/test/:status")
//         .params({
//           status: z.string().transform((val) => parseInt(val)),
//         })
//         .get()
//         .use((req, res) => {
//           return res.end({
//             data: null,
//             status: req.param("status"),
//             statusText: "Bad Request",
//           });
//         })
//         .build(),
//     ]),
//   );

//   expect(client.get("/test/400")).rejects.toThrowError("400");
//   expect(client.get("/test/404")).rejects.toThrowError("404");
//   expect(client.get("/test/500")).rejects.toThrowError("500");
//   expect(client.get("/test/100")).rejects.toThrowError("100");

//   expect(client.get("/test/200")).resolves.toMatchObject({
//     status: 200,
//   });
//   expect(client.get("/test/299")).resolves.toMatchObject({
//     status: 299,
//   });
// });
