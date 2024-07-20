import { expect, test } from "vitest";
import {
  isPathnameValid,
  isSinglePathValid,
  isValidPrefixUrl,
} from "../source/utils/path";

test("isSinglePathValid", () => {
  expect(isSinglePathValid("apple123-ddd")).toBeTruthy();
  expect(isSinglePathValid("abnd.sins~")).toBeTruthy();
  expect(isSinglePathValid("12.2")).toBeTruthy();
  expect(isSinglePathValid(".222")).toBeTruthy();
  expect(isSinglePathValid("index.html")).toBeTruthy();
  expect(isSinglePathValid("word_111_word~ddd.ddd")).toBeTruthy();

  expect(isSinglePathValid(":elnd")).toBeFalsy();
  expect(isSinglePathValid("&lnd")).toBeFalsy();
  expect(isSinglePathValid("&ln=d")).toBeFalsy();
  expect(isSinglePathValid("&l/")).toBeFalsy();
  expect(isSinglePathValid("?drnbd?")).toBeFalsy();
});

test("isPathnameValid", () => {
  expect(isPathnameValid("/live/wive/vibe")).toBeTruthy();
  expect(isPathnameValid("/live/wive/vibe/")).toBeTruthy();
  expect(isPathnameValid("//dbondb//")).toBeFalsy();
  expect(isPathnameValid("/dbondb?/")).toBeFalsy();
  expect(isPathnameValid("dbondb")).toBeTruthy();
});

test("isValidPrefixUrl", () => {
  expect(isValidPrefixUrl("/")).toBeFalsy();
  expect(isValidPrefixUrl("aosdnoidnb")).toBeFalsy();
  expect(isValidPrefixUrl("http://")).toBeFalsy();
  expect(isValidPrefixUrl("http://example.com")).toBeTruthy();
  expect(isValidPrefixUrl("http://example.com/live")).toBeTruthy();
});
