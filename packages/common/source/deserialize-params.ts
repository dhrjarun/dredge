import { otherSchemaToDredgeSchema } from "./dredge-schema";

export function deserializeQueries(
  queries: Record<string, string[]>,
  schema: Record<string, any>,
) {
  const result: Record<string, any[]> = {};

  for (const [key, value] of Object.entries(queries)) {
    const sc = schema[key];
    if (sc) {
      const mySchema = otherSchemaToDredgeSchema(sc);

      if (mySchema?.type === "number") result[key] = value.map(Number);
      else if (mySchema?.type === "boolean")
        result[key] = value.map((v) => (v === "true" ? true : false));
      else if (mySchema?.type === "date")
        result[key] = value.map((v) => new Date(v));
      else result[key] = value;
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function deserializeParams(
  params: Record<string, string>,
  schema: Record<string, any>,
) {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    const sc = schema[key];
    if (sc) {
      const mySchema = otherSchemaToDredgeSchema(sc);

      if (mySchema?.type === "number") result[key] = Number(value);
      else if (mySchema?.type === "boolean")
        result[key] = value === "true" ? true : false;
      else if (mySchema?.type === "date") result[key] = new Date(value);
      else result[key] = value;
    } else {
      result[key] = value;
    }
  }

  return result;
}
