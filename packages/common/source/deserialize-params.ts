import { convertToDredgeSchema } from "./schema/conversion";
import { DredgeArray, DredgeSchema, DredgeTuple } from "./schema/schema";

export function deserializeSearchParams(
  searchParams: URLSearchParams | string,
  schema: Record<string, DredgeSchema | null>,
) {
  if (!searchParams) return {};

  const sp =
    searchParams instanceof URLSearchParams
      ? searchParams
      : new URLSearchParams(searchParams);

  const obj: Record<string, string | string[]> = {};

  for (const key of Object.keys(schema)) {
    const s = schema[key];
    if (!s) {
      continue;
    }

    const isArray = s instanceof DredgeArray || s instanceof DredgeTuple;

    let value = isArray ? sp.getAll(key) : sp.get(key);

    if (!value) {
      continue;
    }

    obj[key] = value;
  }
}

export function deserializeParams(
  params: Record<string, string | string[]>,
  schema: Record<string, any>,
) {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    const sc = schema[key];

    const mySchema = convertToDredgeSchema(sc);
    result[key] = deserializeValue(value, mySchema);
  }

  return result;
}

export function deserializeValue(
  value: string | string[],
  schema?: DredgeSchema | null,
): any {
  if (!schema) return value;

  if (Array.isArray(value)) {
    if (schema.type === "array") {
      const itemSchema = (schema as DredgeArray).innerType;
      return value.map((v) => deserializeValue(v, itemSchema));
    }
    if (schema.type === "tuple") {
      const tupleTypes = (schema as DredgeTuple).items;
      return value.map((v, index) => deserializeValue(v, tupleTypes[index]));
    }
  } else if (schema.type === "number") return Number(value);
  else if (schema.type === "boolean") return value === "true" ? true : false;
  else if (schema.type === "date") return new Date(value);
  else return value;
}
