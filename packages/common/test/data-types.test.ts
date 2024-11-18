import {
  validateDataTypeName,
  parseContentType,
  parseAccept,
  sortAcceptByQFactor,
  DataTypes,
} from "../source/data-types";
import { describe, expect, test } from "vitest";

describe("DataTypes", () => {
  const dataTypes = new DataTypes({
    json: "application/json;charset=utf-8",
    text: "text/plain;charset=utf-8",
    form: "multipart/form-data;boundary=--DredgeBoundary4948584223",
  });

  test("returns contentType header", () => {
    expect(dataTypes.getContentTypeHeader("json")).toBe(
      "application/json;charset=utf-8",
    );
  });
  test("returns accept header", () => {
    expect(dataTypes.getAcceptHeader("json")).toBe("application/json");
  });
  test("returns dataType name when given contentType header", () => {
    expect(
      dataTypes.getDataTypeFromContentType("application/json;param=value"),
    ).toBe("json");
  });
  test("returns dataType name when given accept header", () => {
    expect(dataTypes.getDataTypeFromAccept("application/json,text/plain")).toBe(
      "json",
    );
  });

  test("returns record", () => {
    expect(dataTypes.toRecord()).toStrictEqual({
      json: "application/json;charset=utf-8",
      text: "text/plain;charset=utf-8",
      form: "multipart/form-data;boundary=--DredgeBoundary4948584223",
    });
  });
});

describe("parseContentType", () => {
  test("returns type and no param", () => {
    expect(parseContentType("application/json")).toStrictEqual({
      type: "application/json",
      params: {},
    });
  });

  test("returns type and charset param", () => {
    expect(parseContentType("application/json;charset=utf-8")).toStrictEqual({
      type: "application/json",
      params: {
        charset: "utf-8",
      },
    });
  });

  test("returns type and boundary param", () => {
    expect(
      parseContentType(
        "multipart/form-data;boundary=--DredgeBoundary4948584223",
      ),
    ).toStrictEqual({
      type: "multipart/form-data",
      params: {
        boundary: "--DredgeBoundary4948584223",
      },
    });
  });

  test("returns irrespective of whitespace", () => {
    expect(
      parseContentType(" application/json; charset=utf-8; q=0.9 "),
    ).toStrictEqual({
      type: "application/json",
      params: {
        charset: "utf-8",
        q: "0.9",
      },
    });
  });
});

describe("validateDataTypeName", () => {
  test("return true when given a valid data type name", () => {
    const validDataTypeName = ["json", "form", "text"];
    for (const item of validDataTypeName) {
      expect(validateDataTypeName(item)).toBe(true);
    }
  });

  test("return false when given an invalid data type name", () => {
    const invalidDataTypeName = [
      "url",
      "method",
      "headers",
      "body",
      "baseUrl",
      "status",
      "statusText",
      "data",
      "params",
      "param",
      "queries",
      "query",
      "get",
      "post",
      "put",
      "delete",
      "patch",
      "head",
      "dataType",
      "responseDataType",
      "context",
      "ctx",
    ];

    for (const item of invalidDataTypeName) {
      expect(validateDataTypeName(item)).toBe(false);
    }
  });
});

describe("parseAccept", () => {
  test("do not throw when given invalid input", () => {
    expect(() => parseAccept(undefined as any as string)).not.toThrow();
    expect(() => parseAccept(null as any as string)).not.toThrow();
    expect(() => parseAccept("")).not.toThrow();
    expect(() => parseAccept("abcdefghijklmnop")).not.toThrow();
    expect(() => parseAccept("abcdefg;hijklmnop")).not.toThrow();
    expect(() => parseAccept("abcdefg+hijklmnop")).not.toThrow();
  });
  test("when given a single media type", () => {
    expect(parseAccept("application/json")).toStrictEqual([
      {
        type: "application/json",
        params: {
          q: "1",
        },
      },
    ]);
    expect(parseAccept("application/json;q=0.9")).toStrictEqual([
      {
        type: "application/json",
        params: {
          q: "0.9",
        },
      },
    ]);
  });

  test("when given multiple media types", () => {
    expect(parseAccept("text/plain,text/html;q=0.2")).toStrictEqual([
      {
        type: "text/plain",
        params: {
          q: "1",
        },
      },
      {
        type: "text/html",
        params: {
          q: "0.2",
        },
      },
    ]);
  });

  test("when given muliple media sub-types", () => {
    expect(parseAccept("text/plain+html")).toStrictEqual([
      {
        type: "text/plain",
        params: {
          q: "1",
        },
      },
      {
        type: "text/html",
        params: {
          q: "1",
        },
      },
    ]);

    expect(parseAccept("text/plain+html;q=0.2")).toStrictEqual([
      {
        type: "text/plain",
        params: {
          q: "0.2",
        },
      },
      {
        type: "text/html",
        params: {
          q: "0.2",
        },
      },
    ]);
  });
});

describe("sortAcceptByQFactor", () => {
  test("sorts accepts by q factor", () => {
    const accepts = [
      {
        type: "text/html",
        params: {
          q: "0.1",
        },
      },
      {
        type: "text/plain",
        params: {
          q: "0.4",
        },
      },
      {
        type: "multipart/form-data",
        params: {
          q: "0.2",
        },
      },
      {
        type: "application/json",
        params: {} as any,
      },
    ];

    const sortedAccepts = sortAcceptByQFactor(accepts);

    expect(sortedAccepts[0]?.type).toBe("application/json");
    expect(sortedAccepts[1]?.type).toBe("text/plain");
    expect(sortedAccepts[2]?.type).toBe("multipart/form-data");
    expect(sortedAccepts[3]?.type).toBe("text/html");
  });

  test("sorts accepts by q factor with equal q factors", () => {
    const accepts = [
      {
        type: "text/plain",
        params: {
          q: "0.2",
        },
      },
      {
        type: "text/html",
        params: {
          q: "0.2",
        },
      },
    ];

    const sortedAccepts = sortAcceptByQFactor(accepts);

    expect(sortedAccepts[0]?.type).toBe("text/plain");
    expect(sortedAccepts[1]?.type).toBe("text/html");
  });
});
