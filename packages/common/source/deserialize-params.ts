import { otherSchemaToDredgeSchema } from "./dredge-schema";

export function deserializeParams(
  params: Record<string, string | string[]>,
  schema: Record<string, any>,
) {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    const sc = schema[key];

    if (!sc) {
      result[key] = value;
      continue;
    }

    const mySchema = otherSchemaToDredgeSchema(sc);

    if (Array.isArray(value)) {
      if (mySchema?.type === "number") result[key] = value.map(Number);
      else if (mySchema?.type === "boolean")
        result[key] = value.map((v) => (v === "true" ? true : false));
      else if (mySchema?.type === "date")
        result[key] = value.map((v) => new Date(v));
      else result[key] = value;

      continue;
    }

    if (mySchema?.type === "number") result[key] = Number(value);
    else if (mySchema?.type === "boolean")
      result[key] = value === "true" ? true : false;
    else if (mySchema?.type === "date") result[key] = new Date(value);
    else result[key] = value;
  }

  return result;
}
