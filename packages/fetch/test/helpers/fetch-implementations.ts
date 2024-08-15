import { FetchOptions } from "../../source/types/options";

export const echoHeaders: FetchOptions["fetch"] = async (input, init) => {
  const request = new Request(input, init);

  return new Response(JSON.stringify(Object.fromEntries(request.headers)), {
    headers: {
      "content-type": "application/json",
    },
  });
};

export const echoBody: FetchOptions["fetch"] = async (input, init) => {
  const request = new Request(input, init);

  return new Response(request.body, {
    headers: {
      "content-type": request.headers.get("content-type") || "",
    },
  });
};

export const echoUrl: FetchOptions["fetch"] = async (input, init) => {
  const request = new Request(input, init);

  return new Response(request.url, {
    headers: {
      "content-type": "text/plain",
    },
  });
};
