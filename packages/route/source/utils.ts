import { DataTypes } from "dredge-common";
import { RawContext } from "./context";

export function createRawContext(
  rawContext: Partial<
    Omit<RawContext, "request" | "response"> & {
      request: Partial<RawContext["request"]>;
      response: Partial<RawContext["response"]>;
    }
  > = {},
) {
  const {
    request,
    response,
    state = {},
    dataTypes = new DataTypes({}),
    error,
  } = rawContext;

  const c: RawContext = {
    request: {
      url: request?.url ?? "/test",
      method: request?.method ?? "get",
      headers: request?.headers ?? {},
      data: request?.data ?? {},
      dataType: request?.dataType,
      params: request?.params ?? {},
      queries: request?.queries ?? {},
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