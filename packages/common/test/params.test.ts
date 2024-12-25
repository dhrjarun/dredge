import { expect, test } from "vitest";
import {
  searchParamsToDredgeParams,
  objectToDredgeParams,
  dredgeParamsToSearchParams,
} from "../source/params";

test("objectToDredgeParams", () => {
  const params = objectToDredgeParams(":/test/:isActive", {
    page: ["02", 5],
    skip: "005",
    isActive: true,
  });

  expect(params).toStrictEqual({
    "?page": ["02", 5],
    "?skip": ["005"],
    ":isActive": true,
  });
});

test("searchParamsToDredgeParams", () => {
  const searchParams = new URLSearchParams();
  searchParams.append("page", "02");
  searchParams.append("page", "005");
  searchParams.append("skip", "005");

  expect(searchParamsToDredgeParams(searchParams)).toStrictEqual({
    "?page": ["02", "005"],
    "?skip": ["005"],
  });
});

test("dredgeParamsToSearchParams", () => {
  const params = {
    ":isActive": true,
    "?page": ["02", 5],
    "?skip": ["005"],
  } as any;

  const searchParams = new URLSearchParams();
  searchParams.append("page", "02");
  searchParams.append("page", "5");
  searchParams.append("skip", "005");
  expect(dredgeParamsToSearchParams(params).toString()).toStrictEqual(
    searchParams.toString(),
  );
});
