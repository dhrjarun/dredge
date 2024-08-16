import {
  DredgeRouter,
  dredgeRoute,
  dredgeRouter,
  inferRouteDataTypes,
  inferRouterRoutes,
} from "dredge-route";
import { IsNever } from "ts-essentials";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { directClient } from "../source/direct-client";

// test("method and path", () => {
//   const route = dredgeRoute();
//   const client = directClient([
//     route
//       .path("/test")
//       .put(z.number())
//       .use((req) => {})
//       .build(),

//     route
//       .path("/testI/:paramI")
//       .post(z.string())
//       .use((req, res) => {})
//       .use((req, res) => {
//         res.next({});
//       })
//       .build(),
//   ]);

//   const xR = route
//     .path("/rest/:paramI")
//     .post(z.string())
//     .use((req, res) => {})
//     .use((req, res) => {
//       res.next({});
//     })
//     .build();

//   const yR = route
//     .path("/test")
//     .put(z.number())
//     .use((req) => {})
//     .build();

//   client("/test", {
//     data: 12,
//     method: "put",
//   });
// });

test("", () => {
  const route = dredgeRoute<{ db: any }>().options({
    dataTypes: {
      json: "application/json",
      form: "multipart/form-data",
    },
    dataTransformer: {
      json: {},
    },
  });

  const routes = [
    route
      .path("/user/:userId")
      .delete()
      .params({
        userId: z.string(),
      })
      .build(),
    route
      .options({
        dataTypes: {
          xml: "application/xml",
        },
      })
      .path("/test")
      .post(z.string().optional())
      .use((req, res) => {})
      .use((req, res) => {
        res.next({});
      })
      .build(),

    route
      .path("/test")
      .put(z.number())
      .use((req) => {})
      .build(),
  ] as const;

  const router = dredgeRouter([
    route
      .path("/user/:userId")
      .delete()
      .params({
        userId: z.string(),
      })
      .build(),
    route
      .options({
        dataTypes: {
          xml: "application/xml",
        },
      })
      .path("/test")
      .post(z.string().optional())
      .use((req, res) => {})
      .use((req, res) => {
        res.next({});
      })
      .build(),

    route
      .path("/test")
      .put(z.number())
      .use((req) => {})
      .build(),
  ]);

  const client = directClient(
    dredgeRouter([
      route
        .path("/user/:userId")
        .delete()
        .params({
          userId: z.string(),
        })
        .build(),
      route
        .options({
          dataTypes: {
            xml: "application/xml",
          },
        })
        .path("/test")
        .post(z.string().optional())
        .use((req, res) => {})
        .use((req, res) => {
          res.next({});
        })
        .build(),

      route
        .path("/test")
        .put(z.number())
        .use((req) => {})
        .build(),
    ]),
  );

  client.extends({
    dataTypes: {},
  });

  client.put("/test", {
    data: 2,
  });

  client.post("/test");

  client.delete("/user/DDDD", {});

  client.post("/test", {
    json: "dd",
    dataTypes: {
      json: "application/json",
    },
    serverCtx: {
      db: "",
    },
  });

  client("/test", {
    method: "post",
    json: "",
  });

  client("/test", {
    method: "post",
    data: "test",
  });

  client.put("/test", {
    json: 2,
  });

  client.put("/test", {
    json: 2,
    serverCtx: {
      db: "",
    },
  });

  client("/test", {
    method: "post",
    data: "dd",
  });
});
