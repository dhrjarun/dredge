import type { RootRouter } from "@/router";
import { dredgeFetch } from "dredge-fetch";

export const client = dredgeFetch<RootRouter>().extends({
  prefixUrl: `http://localhost:${process.env.PORT ?? 3000}/api/dredge`,
  dataTypes: {
    json: "application/json",
    text: "text/plain",
  },
});
