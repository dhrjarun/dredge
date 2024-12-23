import { AnyMiddlewareFunction } from "dredge-types";
import { expect, test } from "vitest";
import { composeMiddlewares } from "../source/compose";
import { createRawContext } from "../source/utils";

test("rjects when next() is called multiple times", () => {
  const middlewares: AnyMiddlewareFunction[] = [];
  middlewares.push(async (_, d) => {
    await d.next();
    await d.next();
  });

  const fn = composeMiddlewares(middlewares);
  expect(fn(createRawContext(), () => {})).rejects.toThrowError(
    /multiple times/,
  );
});

test("works", async () => {
  const middlewares: AnyMiddlewareFunction[] = [];

  const calls: number[] = [];

  middlewares.push(async (_, d) => {
    calls.push(1);
    await d.next();
    calls.push(1);
  });
  middlewares.push(async (_, d) => {
    calls.push(2);
    await d.next();
    calls.push(2);
  });
  middlewares.push(async (_, d) => {
    calls.push(3);
    await d.next();
    calls.push(3);
  });

  let fn = composeMiddlewares(middlewares);
  await fn(createRawContext(), () => {});

  expect(calls).toStrictEqual([1, 2, 3, 3, 2, 1]);
});

test("rjects when error is thrown inside middleware", async () => {
  let middlewares: AnyMiddlewareFunction[] = [];

  middlewares.push(async (_, d) => {
    await d.next();
  });
  middlewares.push(async (_, d) => {
    throw "error";
  });

  let fn = composeMiddlewares(middlewares);
  expect(fn(createRawContext(), () => {})).rejects.toThrowError("error");

  middlewares = [];
  middlewares.push(async (_, d) => {
    await d.next();

    throw "error";
  });
  middlewares.push(async (_, d) => {
    await d.next();
  });

  fn = composeMiddlewares(middlewares);
  expect(fn(createRawContext(), () => {})).rejects.toThrowError("error");
});

test("updates context", async () => {
  const context = createRawContext();
  let middlewares: AnyMiddlewareFunction[] = [];

  const updates: any[] = [];

  middlewares.push(async (c, d) => {
    d.state({
      user: "Anuraag",
    });
    updates.push(c.state);
    await d.next();
    d.state({
      user: "Kashyap",
    });
    updates.push(c.state);
  });

  middlewares.push(async (c, d) => {
    d.status(200);
    updates.push(c.res.status);
    await d.next();
    d.status(201);
    updates.push(c.res.status);
  });

  middlewares.push(async (c, d) => {
    d.data({
      movie: "GoWI",
    });
    updates.push(c.res.data);
    await d.next();
    d.data({
      movie: "GoWII",
    });
    updates.push(c.res.data);
  });

  middlewares.push(async (c, d) => {
    d.header("content-type", "text/plain");
    updates.push(c.res.header("content-type"));
    await d.next();
    d.header("content-type", "application/json");
    updates.push(c.res.header("content-type"));
  });

  const fn = composeMiddlewares(middlewares);
  await fn(context, () => {});

  expect(updates).toStrictEqual([
    {
      user: "Anuraag",
    },
    200,
    {
      movie: "GoWI",
    },
    "text/plain",
    "application/json",
    {
      movie: "GoWII",
    },
    201,
    {
      user: "Kashyap",
    },
  ]);
});
