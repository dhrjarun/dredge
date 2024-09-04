import type { RootRouter } from "@/router";
import { dredgeFetch } from "dredge-fetch";

function getBaseUrl() {
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

console.log("base url", getBaseUrl());

export const client = dredgeFetch<RootRouter>().extends({
  prefixUrl: `${getBaseUrl()}/api/dredge`,
  dataTypes: {
    json: "application/json",
    text: "text/plain",
  },
});
