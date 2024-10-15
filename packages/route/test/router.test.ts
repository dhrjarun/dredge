import { expect, test } from "vitest";
import { dredgeRoute } from "../source/route";
import { dredgeRouter } from "../source/router";
import { AnyValidRoute } from "dredge-types";

const userRouter = dredgeRouter([
  dredgeRoute().path("user/:id").get(),
  dredgeRoute().path("user/:id").delete(),
]);

const router = dredgeRouter([
  userRouter,
  dredgeRoute().path("/test-i").get(),
  dredgeRoute().path("test-ii/:param/end").post(),
  dredgeRoute().path("test-iii").delete(),
]);

test("it will return null, if method and path did not matched", async () => {
  expect(router.find("post", ["test-i", "param", "end"])).toBeNull();

  expect(router.find("post", ["test-i", "param", "end"])).toBeNull();

  expect(router.find("post", ["user"])).toBeNull();

  expect(router.find("post", ["test-iii"])).toBeNull();
});

test("it will return route, if method and path matched", async () => {
  const userRouter = dredgeRouter([
    dredgeRoute().path("user/:id").get(),
    dredgeRoute().path("user/:id").delete(),
  ]);

  const router = dredgeRouter([
    userRouter,
    dredgeRoute()
      .path("/post")
      .get()
      .use((_req, res) => {
        res.end();
      }),

    dredgeRoute().path("/post").post(),
  ]);

  expect(router.find("get", ["user", "1"])!._def).toMatchObject({
    method: "get",
    paths: ["user", ":id"],
  });

  expect(router.find("delete", ["user", "1"])!._def).toMatchObject({
    method: "delete",
    paths: ["user", ":id"],
  });

  expect(router.find("get", ["post"])!._def).toMatchObject({
    method: "get",
    paths: ["post"],
  });

  expect(router.find("post", ["post"])!._def).toMatchObject({
    method: "post",
    paths: ["post"],
  });
});

test("it will throw, if more than one dynamic path at same level", async () => {
  expect(() =>
    dredgeRouter([
      dredgeRoute().path("/a/:b").get(),
      dredgeRoute().path("/a/:c").get(),
    ]),
  ).toThrowError();

  expect(() =>
    dredgeRouter([
      dredgeRoute().path("/a/:b/c/d").get(),
      dredgeRoute().path("/a/:c/c/d").get(),
    ]),
  ).toThrowError();
});

test("it will throw if two or more route are same", () => {
  expect(() =>
    dredgeRouter([
      dredgeRoute().path("/a").get(),
      dredgeRoute().path("/a").post(),
      dredgeRoute().path("/a/b/c").delete(),
      dredgeRoute().path("/a/b/c").put(),
    ]),
  ).not.toThrowError();

  expect(() =>
    dredgeRouter([
      dredgeRoute().path("/a").get(),
      dredgeRoute().path("/a").get(),
    ]),
  ).toThrowError();

  expect(() =>
    dredgeRouter([
      dredgeRoute().path("/a/:b").get(),
      dredgeRoute().path("/a/:b").post(),
    ]),
  ).not.toThrowError();

  expect(() =>
    dredgeRouter([
      dredgeRoute().path("/a/:b").get(),
      dredgeRoute().path("/a/:b").get(),
    ]),
  ).toThrowError();

  expect(() =>
    dredgeRouter([
      dredgeRoute().path("/a/:b/c/d").get(),
      dredgeRoute().path("/a/:b/c/d").get(),
    ]),
  ).toThrowError();
});

test("if path and method is not defined, it should throw", () => {
  expect(() => {
    dredgeRouter([dredgeRoute().path("/test")]);
  }).toThrowError();

  expect(() => {
    dredgeRouter([dredgeRoute().get()]);
  }).toThrowError();

  expect(() => {
    dredgeRouter([dredgeRoute().path("/test").get()]);
  }).not.toThrowError();
});
