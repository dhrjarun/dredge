import { untypedDredgeFetch } from "../../source/dredge-fetch";

export const prefixUrl = "https://a.com";
export const client = untypedDredgeFetch().extends({
  dataTypes: {
    json: "application/json",
    form: "multipart/form-data",
    text: "text/plain",
  },
  prefixUrl,
});
