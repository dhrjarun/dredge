import { describe, expect, test } from "vitest";
import { MimeStore } from "../source/mime-store";

describe("MimeStore", () => {
  test("mimeType/mimeSubType", () => {
    const mimeStore = new MimeStore();

    const payload = {
      fn: () => {},
      as: "text",
    };
    mimeStore.set("application/json", payload);
    expect(mimeStore.get("application/json")).toEqual(payload);

    const newPayload = {
      fn: () => {},
      as: "text",
    };
    mimeStore.set("application/json", newPayload);
    expect(mimeStore.get("application/json")).toEqual(newPayload);
  });

  test("mimeType/*", () => {
    const mimeStore = new MimeStore();

    const applicationMemeTypePayload = {
      fn: () => {},
      as: "text",
    };
    mimeStore.set("application/*", applicationMemeTypePayload);
    expect(mimeStore.get("application/json")).toEqual(
      applicationMemeTypePayload,
    );
    expect(mimeStore.get("application/xml")).toEqual(
      applicationMemeTypePayload,
    );
    expect(mimeStore.get("application/javascript")).toEqual(
      applicationMemeTypePayload,
    );

    expect(mimeStore.get("text/json")).not.toEqual(applicationMemeTypePayload);
    expect(mimeStore.get("multipart/form-data")).not.toEqual(
      applicationMemeTypePayload,
    );

    const textMimeTypePayload = {
      fn: () => {},
      as: "text",
    };
    mimeStore.set("text/*", textMimeTypePayload);
    expect(mimeStore.get("text/plain")).toEqual(textMimeTypePayload);
    expect(mimeStore.get("text/html")).toEqual(textMimeTypePayload);
  });

  test("*/mimeSubType", () => {
    const mimeStore = new MimeStore();

    const payload = {
      fn: () => {},
      as: "text",
    };

    mimeStore.set("*/json", payload);
    expect(mimeStore.get("application/json")).toEqual(payload);
    expect(mimeStore.get("text/json")).toEqual(payload);
    expect(mimeStore.get("multipart/json")).toEqual(payload);
  });

  test("*/*", () => {
    const mimeStore = new MimeStore();

    const anyPayload = {
      fn: () => {},
      as: "text",
    };

    mimeStore.set("*/*", anyPayload);
    expect(mimeStore.get("application/json")).toEqual(anyPayload);
    expect(mimeStore.get("text/json")).toEqual(anyPayload);
    expect(mimeStore.get("multipart/form-data")).toEqual(anyPayload);

    const jsonPayload = {
      fn: () => {},
      as: "text",
    };
    mimeStore.set("application/json", jsonPayload);
    expect(mimeStore.get("application/json")).toEqual(jsonPayload);

    const applicationMimeTypePayload = {
      fn: () => {},
      as: "text",
    };
    mimeStore.set("application/*", applicationMimeTypePayload);
    expect(mimeStore.get("application/javascript")).toEqual(
      applicationMimeTypePayload,
    );
    expect(mimeStore.get("application/xml")).toEqual(
      applicationMimeTypePayload,
    );

    expect(mimeStore.get("text/plain")).toEqual(anyPayload);
    expect(mimeStore.get("multipart/form-data")).toEqual(anyPayload);
  });
});
