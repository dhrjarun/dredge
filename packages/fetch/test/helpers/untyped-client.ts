import { untypedDredgeFetch } from "../../source/dredge-fetch";

export const prefixUrl = "https://a.com";
export const client = untypedDredgeFetch().extends({
  dataTypes: {
    json: "application/json",
    form: "multipart/form-data",
    text: "text/plain",
  },
  prefixUrl,

  dataSerializers: {
    "application/json": async ({ data }) => {
      return JSON.stringify(data);
    },
    "text/plain": async ({ data }) => {
      if (typeof data === "string") return data;
      return "";
    },
  },
  bodyParsers: {
    "application/json": async ({ text }) => {
      const payload = await text();
      if (!payload) return;
      return JSON.parse(payload);
    },
    "text/plain": async ({ text }) => {
      const payload = await text();
      if (!payload) return;
      return payload;
    },
  },
});
