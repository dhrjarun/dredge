import { dredgeRoute } from "./helpers/dredge-route";
import { dredgeRouter } from "./helpers/dredge-router";
import z from "zod";

export const singleParamNonAutoRouter = dredgeRouter([
  dredgeRoute()
    .path("/a/b/c/d")
    .get()
    .use((_req, res) => {
      return res.end({
        data: "GET/a/b/c/d" as const,
      });
    }),

  dredgeRoute()
    .path("/a/b/c/d")
    .delete()
    .use((_req, res) => {
      return res.end({
        data: "DELETE/a/b/c/d" as const,
      });
    }),

  dredgeRoute()
    .path("/:a/b/c/d")
    .get()
    .use((_req, res) => {
      return res.end({
        data: "GET/:a/b/c/d" as const,
      });
    }),

  dredgeRoute()
    .path("/:a/b/c/d")
    .put()
    .input(z.any())
    .use((_req, res) => {
      return res.end({
        data: "PUT/:a/b/c/d" as const,
      });
    }),

  dredgeRoute()
    .path("/a/:b/c/d")
    .get()
    .params({
      b: z.number(),
    })
    .use((_req, res) => {
      return res.end({
        data: "GET/a/:b/c/d" as const,
      });
    }),

  dredgeRoute()
    .path("/a/b/:c/d")
    .params({
      c: z.bigint(),
    })
    .get()
    .use((_req, res) => {
      return res.end({
        data: "GET/a/b/:c/d" as const,
      });
    }),

  dredgeRoute()
    .path("/a/b/c/:d")
    .params({
      d: z.date(),
    })
    .get()
    .use((_req, res) => {
      return res.end({
        data: "GET/a/b/c/:d" as const,
      });
    }),
]);

export const singleParamAutoRouter = dredgeRouter([
  dredgeRoute().path("/e/f/g/h").get(),
  dredgeRoute()
    .path("/:e/f/g/h")
    .params({
      e: z.enum(["a", "b"]),
    })
    .get()
    .use((_req, res) => {
      return res.end({
        data: "GET/:e/f/g/h" as const,
      });
    }),
  dredgeRoute()
    .path("/e/:f/g/h")
    .params({
      f: z.boolean(),
    })
    .get()
    .use((_req, res) => {
      return res.end({
        data: "GET/e/:f/g/h" as const,
      });
    }),
  dredgeRoute()
    .path("/e/f/:g/h")
    .params({
      g: z.undefined(),
    })
    .get()
    .use((_req, res) => {
      return res.end({
        data: "GET/e/f/:g/h" as const,
      });
    }),
  dredgeRoute()
    .path("/e/f/g/:h")
    .params({
      h: z.null(),
    })
    .get()
    .use((_req, res) => {
      return res.end({
        data: "GET/e/f/g/:h" as const,
      });
    }),
]);

export const doubleParamNonAutoRouter = dredgeRouter([
  dredgeRoute().path("/s/t/u/v/w/x").get(),
  dredgeRoute()
    .path("/:s/t/:u/v/w/x")
    .params({
      s: z.string(),
      u: z.number(),
    })
    .get()
    .use((_req, res) => {
      return res.end({
        data: "GET/:s/t/:u/v/w/x" as const,
      });
    }),
  dredgeRoute()
    .path("/s/:t/u/:v/w/x")
    .params({
      t: z.number(),
      v: z.bigint(),
    })
    .get()
    .use((_req, res) => {
      return res.end({
        data: "GET/s/:t/u/:v/w/x" as const,
      });
    }),
  dredgeRoute()
    .path("/s/t/u/v/:w/:x")
    .params({
      w: z.bigint(),
      x: z.date(),
    })
    .get()
    .use((_req, res) => {
      return res.end({
        data: "GET/s/t/u/v/:w/:x" as const,
      });
    }),
]);
export const doubleParamAutoRouter = dredgeRouter([
  dredgeRoute().path("/p/q/r/s/t/u").get(),
  dredgeRoute()
    .path("/:p/q/:r/s/t/u")
    .params({
      p: z.enum(["a", "b"]),
      r: z.boolean(),
    })
    .get()
    .use((_req, res) => {
      return res.end({
        data: "GET/:p/q/:r/s/t/u" as const,
      });
    }),
  dredgeRoute()
    .path("/p/:q/r/:s/t/u")
    .params({
      q: z.boolean(),
      s: z.undefined(),
    })
    .get()
    .use((_req, res) => {
      return res.end({
        data: "/GET/p/:q/r/:s/t/u" as const,
      });
    }),
  dredgeRoute()
    .path("/p/q/r/s/:t/:u")
    .params({
      t: z.undefined(),
      u: z.null(),
    })
    .get()
    .use((_req, res) => {
      return res.end({
        data: "GET/p/q/r/s/:t/:u" as const,
      });
    }),
]);

export const pathRouter = dredgeRouter([
  singleParamNonAutoRouter,
  singleParamAutoRouter,
  doubleParamNonAutoRouter,
  doubleParamAutoRouter,
]);
