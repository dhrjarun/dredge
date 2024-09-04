import { dredgeFetch } from "dredge-fetch";
import type { RootRouter } from "./router";

export const client = dredgeFetch<RootRouter>().extends({
  prefixUrl: `http://localhost:${process.env.PORT ?? 3000}`,
  dataTypes: {
    json: "application/json",
    text: "text/plain",
  },
});

export async function getHelloWorld() {
  const data = await client.get("/hello-world").data();

  return data;
}

export async function getSayMyName(name: string) {
  const data = await client.get(`/say-my-name/${name}`).data();

  return data;
}
