import {
  DredgeArray,
  DredgeBaseSchema,
  DredgeBoolean,
  DredgeDate,
  DredgeNumber,
  DredgeObject,
  DredgeSchema,
  type DredgeSchemaOptions,
  DredgeString,
  DredgeTuple,
  DredgeUnknown,
} from "./schema";

export function zodSchemaToDredgeSchema(schema: any): DredgeSchema {
  const { schema: _schema, ...options } = handleZodInnerTypes(schema);
  const typeName = _schema._def.typeName;

  if (typeName === "ZodString") {
    return new DredgeString(options);
  }
  if (typeName === "ZodNumber") {
    return new DredgeNumber(options);
  }
  if (typeName === "ZodBoolean") {
    return new DredgeBoolean(options);
  }
  if (typeName === "ZodDate") {
    return new DredgeDate(options);
  }
  if (typeName === "ZodArray") {
    const innerType = zodSchemaToDredgeSchema(_schema._def.type);
    if (!innerType) return new DredgeUnknown();
    return new DredgeArray(innerType, options);
  }
  if (typeName === "ZodObject") {
    const properties: Record<string, DredgeBaseSchema<any>> = {};
    for (const [key, value] of Object.entries(_schema._def.shape())) {
      const converted = zodSchemaToDredgeSchema(value);
      if (converted) {
        properties[key] = converted;
      }
    }
    return new DredgeObject(properties, options);
  }
  if (typeName === "ZodTuple") {
    const items = _schema._def.items.map((item: any) =>
      zodSchemaToDredgeSchema(item),
    );
    if (!items.length) return new DredgeUnknown();
    return new DredgeTuple(items, options);
  }

  return new DredgeUnknown();
}

function handleZodInnerTypes(
  schema: any,
  options: { nullable?: boolean; optional?: boolean; default?: any } = {},
): { schema: any } & DredgeSchemaOptions {
  const typeName = schema._def.typeName as keyof typeof typeMap;

  const typeMap = {
    ZodOptional: "optional",
    ZodNullable: "nullable",
    ZodDefault: "default",
  };

  if (typeName in typeMap) {
    const innerSchema = schema._def.innerType;

    const t = typeMap[typeName];

    return handleZodInnerTypes(innerSchema, {
      ...options,
      [t]: true,
    });
  }

  return {
    ...options,
    schema,
  };
}
