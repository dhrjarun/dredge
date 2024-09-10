import type { RootRouter } from "@/router";
import { dredgeFetch } from "dredge-fetch";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const client = dredgeFetch<RootRouter>().extends({
  prefixUrl: `${getBaseUrl()}/api/dredge`,
  dataTypes: {
    json: "application/json",
    text: "text/plain",
  },
});
