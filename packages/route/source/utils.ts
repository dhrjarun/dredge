import { DataTypes } from "dredge-common";
import { RawContext } from "./context";

export function createRawContext(
  rawContext: Partial<
    Omit<RawContext, "request" | "response" | "schema"> & {
      request: Partial<RawContext["request"]>;
      response: Partial<RawContext["response"]>;
      schema: Partial<RawContext["schema"]>;
    }
  > = {},
) {
  const {
    request,
    response,
    schema,
    state = {},
    dataTypes = new DataTypes({}),
    error,
  } = rawContext;

  const c: RawContext = {
    schema: {
      method: schema?.method ?? null,
      paths: schema?.paths ?? [],
      params: schema?.params ?? {},
      input: schema?.input ?? null,
      output: schema?.output ?? null,
    },
    request: {
      url: request?.url ?? "/test",
      method: request?.method ?? "get",
      headers: request?.headers ?? {},
      data: request?.data ?? {},
      dataType: request?.dataType,
      params: request?.params ?? {},
    },
    response: {
      status: response?.status ?? 200,
      statusText: response?.statusText ?? "OK",
      dataType: response?.dataType,
      data: response?.data ?? {},
      headers: response?.headers ?? {},
    },
    state,
    dataTypes,
    error,
  };

  return c;
}
