import { trimSlashes } from "dredge-common";
import fetch from "node-fetch";

export type Client = (
  url: string,
  init?: fetch.RequestInit,
) => Promise<fetch.Response>;

export function c(address: any) {
  const port = (address as any)?.port;
  const baseUrl = `http://localhost:${port}`;

  let client: Client = (url: string, options: any) => {
    return fetch(baseUrl + "/" + trimSlashes(url), options);
  };

  return client;
}
