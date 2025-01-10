import {
  DredgeArray,
  DredgeSchema,
  DredgeTuple,
  otherSchemaToDredgeSchema,
} from "./dredge-schema";

export function deserializeParams(
  params: Record<string, string | string[]>,
  schema: Record<string, any>,
) {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(params)) {
    const sc = schema[key];

    const mySchema = otherSchemaToDredgeSchema(sc);
    result[key] = deserializeParamValue(value, mySchema);
  }

  return result;
}

function deserializeParamValue(
  value: string | string[],
  schema?: DredgeSchema | null,
): any {
  if (!schema) return value;

  if (Array.isArray(value)) {
    if (schema.type === "array") {
      const itemSchema = (schema as DredgeArray).innerType;
      return value.map((v) => deserializeParamValue(v, itemSchema));
    }
    if (schema.type === "tuple") {
      const tupleTypes = (schema as DredgeTuple).items;
      return value.map((v, index) =>
        deserializeParamValue(v, tupleTypes[index]),
      );
    }
  } else if (schema.type === "number") return Number(value);
  else if (schema.type === "boolean") return value === "true" ? true : false;
  else if (schema.type === "date") return new Date(value);
  else return value;
}
