import z from "zod";
import { dredgeRoute } from "./helpers/dredge-route";
import { dredgeRouter } from "./helpers/dredge-router";

export const singleParamNonAutoRouter = dredgeRouter([
  dredgeRoute()
    .path("/a/b/c/d")
    .get()
    .use((d) => {
      return d.data("GET/a/b/c/d" as const);
    }),

  dredgeRoute()
    .path("/a/b/c/d")
    .delete()
    .use((d) => {
      return d.data("DELETE/a/b/c/d" as const);
    }),

  dredgeRoute()
    .path("/:a/b/c/d")
    .get()
    .use((d) => {
      return d.data("GET/:a/b/c/d" as const);
    }),

  dredgeRoute()
    .path("/:a/b/c/d")
    .put()
    .input(z.any())
    .use((d) => {
      return d.data("PUT/:a/b/c/d" as const);
    }),

  dredgeRoute()
    .path("/a/:b/c/d")
    .get()
    .params({
      b: z.number(),
    })
    .use((d) => {
      return d.data("GET/a/:b/c/d" as const);
    }),

  dredgeRoute()
    .path("/a/b/:c/d")
    .params({
      c: z.bigint(),
    })
    .get()
    .use((d) => {
      return d.data("GET/a/b/:c/d" as const);
    }),

  dredgeRoute()
    .path("/a/b/c/:d")
    .params({
      d: z.date(),
    })
    .get()
    .use((d) => {
      return d.data("GET/a/b/c/:d" as const);
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
    .use((d) => {
      return d.data("GET/:e/f/g/h" as const);
    }),
  dredgeRoute()
    .path("/e/:f/g/h")
    .params({
      f: z.boolean(),
    })
    .get()
    .use((d) => {
      return d.data("GET/e/:f/g/h" as const);
    }),
  dredgeRoute()
    .path("/e/f/:g/h")
    .params({
      g: z.undefined(),
    })
    .get()
    .use((d) => {
      return d.data("GET/e/f/:g/h" as const);
    }),
  dredgeRoute()
    .path("/e/f/g/:h")
    .params({
      h: z.null(),
    })
    .get()
    .use((d) => {
      return d.data("GET/e/f/g/:h" as const);
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
    .use((d) => {
      return d.data("GET/:s/t/:u/v/w/x" as const);
    }),
  dredgeRoute()
    .path("/s/:t/u/:v/w/x")
    .params({
      t: z.number(),
      v: z.bigint(),
    })
    .get()
    .use((d) => {
      return d.data("GET/s/:t/u/:v/w/x" as const);
    }),
  dredgeRoute()
    .path("/s/t/u/v/:w/:x")
    .params({
      w: z.bigint(),
      x: z.date(),
    })
    .get()
    .use((d) => {
      return d.data("GET/s/t/u/v/:w/:x" as const);
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
    .use((d) => {
      return d.data("GET/:p/q/:r/s/t/u" as const);
    }),
  dredgeRoute()
    .path("/p/:q/r/:s/t/u")
    .params({
      q: z.boolean(),
      s: z.undefined(),
    })
    .get()
    .use((d) => {
      return d.data("/GET/p/:q/r/:s/t/u" as const);
    }),
  dredgeRoute()
    .path("/p/q/r/s/:t/:u")
    .params({
      t: z.undefined(),
      u: z.null(),
    })
    .get()
    .use((d) => {
      return d.data("GET/p/q/r/s/:t/:u" as const);
    }),
]);

export const pathRouter = dredgeRouter([
  singleParamNonAutoRouter,
  singleParamAutoRouter,
  doubleParamNonAutoRouter,
  doubleParamAutoRouter,
]);
