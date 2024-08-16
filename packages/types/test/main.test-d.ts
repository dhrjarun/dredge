import { expectTypeOf, test } from "vitest";
import {
  ExcludeRoute,
  ExtractRouteBy,
  HasRouteParamPath,
  Route,
} from "../source/route";
import { ModifyRoutes, OverwriteRoutes } from "../source/router";

test("ExtractRouteBy", () => {
  type GetUserRoute = Route<
    {
      withDynamicPath: false;
      initialContext: {};
      modifiedInitialContext: {};
      dataTypes: {};
    },
    any,
    any,
    "get",
    ["user"],
    any,
    any,
    any,
    any,
    any
  >;
  type GetUserByIdRoute = Route<
    {
      withDynamicPath: false;
      initialContext: {};
      modifiedInitialContext: {};
      dataTypes: {};
    },
    any,
    any,
    "get",
    ["user", ":id"],
    {},
    any,
    any,
    any,
    any
  >;
  type PostUserRoute = Route<
    {
      withDynamicPath: false;
      initialContext: {};
      modifiedInitialContext: {};
      dataTypes: {};
    },
    any,
    any,
    "post",
    ["user"],
    {},
    any,
    any,
    any,
    any
  >;
  type WithDynamicPathRoute = Route<
    {
      withDynamicPath: true;
      initialContext: {};
      modifiedInitialContext: {};
      dataTypes: {};
    },
    any,
    any,
    "delete",
    ["user", ":id"],
    {},
    any,
    null,
    any,
    {}
  >;

  type Routes = [
    GetUserRoute,
    PostUserRoute,
    GetUserByIdRoute,
    WithDynamicPathRoute,
  ];

  expectTypeOf<
    ExtractRouteBy<Routes[number], "get">
  >().toEqualTypeOf<GetUserRoute>();

  expectTypeOf<
    ExtractRouteBy<Routes[number], "get", "/user/id">
  >().toEqualTypeOf<GetUserByIdRoute>();

  type UserRoute = ExtractRouteBy<Routes[number], any, "/user">;
  // expectTypeOf<UserRoute>().not.toEqualTypeOf<GetUserByIdRoute>();
  expectTypeOf<UserRoute>().toEqualTypeOf<GetUserRoute>();
  expectTypeOf<UserRoute>().toEqualTypeOf<PostUserRoute>();
});

test("ExcludeRoute", () => {
  type GetUserByIdRoute = Route<
    {
      withDynamicPath: false;
    },
    any,
    any,
    "get",
    ["user", ":id"],
    {},
    any,
    any,
    any,
    any
  >;

  type GetUsers = Route<
    {
      withDynamicPath: false;
    },
    any,
    any,
    "get",
    ["users"],
    {},
    any,
    any,
    any,
    any
  >;

  type PostUsers = Route<
    {
      withDynamicPath: false;
    },
    any,
    any,
    "post",
    ["users"],
    {},
    any,
    any,
    any,
    any
  >;

  type GetAdminRoute = Route<
    {
      withDynamicPath: false;
    },
    any,
    any,
    "get",
    ["user", "admin"],
    {},
    any,
    any,
    any,
    any
  >;

  type Routes = [GetUserByIdRoute, GetAdminRoute, GetUsers, PostUsers];

  type ModifiedRoutes = ModifyRoutes<Routes>;

  type y = ExcludeRoute<Routes[number], GetUserByIdRoute>;
});
