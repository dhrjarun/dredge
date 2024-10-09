import { expect, test } from "vitest";
import { dredgeRoute } from "../source/route";
import { dredgeRouter } from "../source/router";

const userRouter = dredgeRouter([
  dredgeRoute().path("user/:id").get().build(),
  dredgeRoute().path("user/:id").delete().build(),
]);

const router = dredgeRouter([
  userRouter,
  dredgeRoute().path("/test-i").get().build(),
  dredgeRoute().path("test-ii/:param/end").post().build(),
  dredgeRoute().path("test-iii").delete().build(),
]);

test("it will return null, if method and path did not matched", async () => {
  expect(router.find("post", ["test-i", "param", "end"])).toBeNull();

  expect(router.find("post", ["test-i", "param", "end"])).toBeNull();

  expect(router.find("post", ["user"])).toBeNull();

  expect(router.find("post", ["test-iii"])).toBeNull();
});

test("it will return route, if method and path matched", async () => {
  const userRouter = dredgeRouter([
    dredgeRoute().path("user/:id").get().build(),
    dredgeRoute().path("user/:id").delete().build(),
  ]);

  const router = dredgeRouter([
    userRouter,
    dredgeRoute()
      .path("/post")
      .get()
      .use((_req, res) => {
        res.end();
      })
      .build(),

    dredgeRoute().path("/post").post().build(),
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
      dredgeRoute().path("/a/:b").get().build(),
      dredgeRoute().path("/a/:c").get().build(),
    ]),
  ).toThrowError();

  expect(() =>
    dredgeRouter([
      dredgeRoute().path("/a/:b/c/d").get().build(),
      dredgeRoute().path("/a/:c/c/d").get().build(),
    ]),
  ).toThrowError();
});

test("it will throw if two or more route are same", () => {
  expect(() =>
    dredgeRouter([
      dredgeRoute().path("/a").get().build(),
      dredgeRoute().path("/a").post().build(),
      dredgeRoute().path("/a/b/c").delete().build(),
      dredgeRoute().path("/a/b/c").put().build(),
    ]),
  ).not.toThrowError();

  expect(() =>
    dredgeRouter([
      dredgeRoute().path("/a").get().build(),
      dredgeRoute().path("/a").get().build(),
    ]),
  ).toThrowError();

  expect(() =>
    dredgeRouter([
      dredgeRoute().path("/a/:b").get().build(),
      dredgeRoute().path("/a/:b").post().build(),
    ]),
  ).not.toThrowError();

  expect(() =>
    dredgeRouter([
      dredgeRoute().path("/a/:b").get().build(),
      dredgeRoute().path("/a/:b").get().build(),
    ]),
  ).toThrowError();

  expect(() =>
    dredgeRouter([
      dredgeRoute().path("/a/:b/c/d").get().build(),
      dredgeRoute().path("/a/:b/c/d").get().build(),
    ]),
  ).toThrowError();
});
