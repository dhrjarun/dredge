import {
  DredgeArray,
  DredgeBaseSchema,
  DredgeBoolean,
  DredgeDate,
  DredgeNumber,
  DredgeObject,
  DredgeSchema,
  DredgeString,
  DredgeTuple,
  DredgeUnknown,
} from "./schema";

export function yupSchemaToDredgeSchema(schema: any): DredgeSchema {
  const typeName = schema.type;
  const options = {
    optional: !!schema.spec?.optional,
    default: schema?.default,
  };

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
    const innerType = yupSchemaToDredgeSchema(schema.innerType);
    if (!innerType) return new DredgeUnknown();
    return new DredgeArray(innerType, options);
  }
  if (typeName === "tuple") {
    const items = schema.spec.types.map((item: any) =>
      yupSchemaToDredgeSchema(item),
    );
    if (!items.length) return new DredgeUnknown();
    return new DredgeTuple(items, options);
  }
  if (typeName === "object") {
    const properties: Record<string, DredgeBaseSchema<any>> = {};
    for (const [key, value] of Object.entries(schema.fields)) {
      const converted = yupSchemaToDredgeSchema(value);
      if (converted) {
        properties[key] = converted;
      }
    }
    return new DredgeObject(properties, options);
  }

  return new DredgeUnknown();
}
