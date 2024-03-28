export const isResponseOk = (response: any): boolean => {
  const { statusCode } = response;
  const { followRedirect } = response.request.options;
  const shouldFollow =
    typeof followRedirect === "function"
      ? followRedirect(response)
      : followRedirect;
  const limitStatusCode = shouldFollow ? 299 : 399;

  return (
    (statusCode >= 200 && statusCode <= limitStatusCode) || statusCode === 304
  );
};

class DredgeClient {
  constructor(options: {
    prefixUrl: URL | string;
    bodyTransformer: {};
    fetch?: (
      input: string | URL | globalThis.Request,
      init?: RequestInit
    ) => Promise<Response>;
  }) {}
}

fetch;
