import { expect, test } from "vitest";
import {
  objectToSearchParams,
  searchParamsToObject,
} from "../source/utils/search-params";

test("objectToSearchParams", () => {
  const searchParams = objectToSearchParams({
    page: ["02", 5],
    skip: "005",
    isActive: true,
  });

  expect(searchParams.toString()).toBe("page=02&page=5&skip=005&isActive=true");
});

test("searchParamsToObject", () => {
  const searchParams = new URLSearchParams();
  searchParams.append("page", "02");
  searchParams.append("page", "005");
  searchParams.append("skip", "005");

  expect(searchParamsToObject(searchParams)).toStrictEqual({
    page: ["02", "005"],
    skip: ["005"],
  });
});
