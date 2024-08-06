export const mergeHeaders = (
  source1: HeadersInit = {},
  source2: HeadersInit = {},
): Headers => {
  const result = new globalThis.Headers(source1 as RequestInit["headers"]);
  const isHeadersInstance = source2 instanceof globalThis.Headers;
  const source = new globalThis.Headers(source2 as RequestInit["headers"]);

  for (const [key, value] of source.entries()) {
    if ((isHeadersInstance && value === "undefined") || value === undefined) {
      result.delete(key);
    } else {
      result.set(key, value);
    }
  }

  return result;
};
