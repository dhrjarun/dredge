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

export function mergeHeaders(
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

  return mergeHeaders(headers, ...sources);
}
