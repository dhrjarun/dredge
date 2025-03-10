import {
  DredgeArray,
  DredgeBaseSchema,
  DredgeBoolean,
  DredgeDate,
  DredgeNumber,
  DredgeObject,
  DredgeSchema,
  DredgeString,
  DredgeUnknown,
} from "./schema";

export function superStructSchemaToDredgeSchema(schema: any): DredgeSchema {
  const options = {
    optional: schema?.is?.(undefined),
  };
  const typeName = schema.type;

  if (typeName === "string") {
    return new DredgeString(options);
  }
  if (typeName === "number") {
    return new DredgeNumber(options);
  }
  if (typeName === "boolean") {
    return new DredgeBoolean(options);
  }
  if (typeName === "date") {
    return new DredgeDate(options);
  }

  if (typeName === "array") {
    const innerType = superStructSchemaToDredgeSchema(schema.schema);
    if (!innerType) return new DredgeUnknown();
    return new DredgeArray(innerType, options);
  }

  if (typeName === "object") {
    const properties: Record<string, DredgeBaseSchema<any>> = {};
    for (const [key, value] of Object.entries(schema.schema)) {
      const converted = superStructSchemaToDredgeSchema(value);
      if (converted) {
        properties[key] = converted;
      }
    }
    return new DredgeObject(properties, options);
  }

  return new DredgeUnknown();
}
