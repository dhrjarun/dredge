const notAllowedDuplicateHeaders = [
  "age",
  "authorization",
  "content-length",
  "content-type",
  "etag",
  "expires",
  "from",
  "host",
  "if-modified-since",
  "if-unmodified-since",
  "last-modified",
  "location",
  "max-forwards",
  "proxy-authorization",
  "referer",
  "retry-after",
  "server",
  "user-agent",
];

export function joinDuplicateHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const newHeaders: Record<string, string> = {};

  for (let headerName in headers) {
    headerName = headerName.toLowerCase();
    const headerValue = headers[headerName];

    if (typeof headerValue == "string") {
      newHeaders[headerName] = headerValue;
    }

    if (Array.isArray(headerValue)) {
      if (notAllowedDuplicateHeaders.includes(headerName)) {
        newHeaders[headerName] = headerValue[0] as string;
      } else if (headerName == "set-cookie") {
        newHeaders[headerName] = headerValue.join("; ");
      } else {
        newHeaders[headerName] = headerValue.join(", ");
      }
    }
  }

  return newHeaders;
}

export function mergeDredgeHeaders(
  target: Record<string, string>,
  ...sources: Record<string, string | null>[]
) {
  if (!sources.length) return target;
  const source = sources.shift();

  const headers = { ...target };
  for (const header in source) {
    // https://nodejs.org/api/http.html#messageheaders
    if (!source[header]) {
      delete headers[header];
    } else {
      headers[header.toLowerCase()] = source[header]!;
    }
  }

  return mergeDredgeHeaders(headers, ...sources);
}

export function normalizeHeaders(headers: Record<string, string>) {
  const newHeaders: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    newHeaders[key.toLowerCase()] = value;
  }

  return newHeaders;
}

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
