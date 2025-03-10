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

function handleValibotInnerTypes(
  schema: any,
  options: { nullable?: boolean; optional?: boolean; default?: any } = {},
): { schema: any } & DredgeSchemaOptions {
  const type = schema.type as keyof typeof typeMap;

  const typeMap = {
    optional: "optional",
    nullable: "nullable",
  };

  if (type in typeMap) {
    const innerSchema = schema.wrapped;

    const t = typeMap[type];

    return handleValibotInnerTypes(innerSchema, {
      ...options,
      default: schema.default,
      [t]: true,
    });
  }

  return {
    ...options,
    schema,
  };
}

export function valibotSchemaToDredgeSchema(schema: any): DredgeSchema {
  const { schema: _schema, ...options } = handleValibotInnerTypes(schema);
  const type = _schema.type;

  if (type === "string") {
    return new DredgeString(options);
  }
  if (type === "number") {
    return new DredgeNumber(options);
  }
  if (type === "boolean") {
    return new DredgeBoolean(options);
  }
  if (type === "date") {
    return new DredgeDate(options);
  }
  if (type === "array") {
    const innerType = valibotSchemaToDredgeSchema(_schema.item);
    if (!innerType) return null;
    return new DredgeArray(innerType, options);
  }
  if (type === "tuple") {
    const items = _schema.items.map((item: any) =>
      valibotSchemaToDredgeSchema(item),
    );
    if (!items.length) return null;
    return new DredgeTuple(items, options);
  }
  if (type === "object") {
    const properties: Record<string, DredgeBaseSchema<any>> = {};
    for (const [key, value] of Object.entries(_schema.entries)) {
      const converted = valibotSchemaToDredgeSchema(value);
      if (converted) {
        properties[key] = converted;
      }
    }
    return new DredgeObject(properties, options);
  }

  return new DredgeUnknown();
}
