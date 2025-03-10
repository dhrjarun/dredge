type DredgeSchemaOptions = {
  description?: string;
  optional?: boolean;
  nullable?: boolean;
  default?: any;
};

export class DredgeBaseSchema<T extends string> {
  readonly type: T;
  description: string;
  optional: boolean; // information of optional is not needed to deserialize because, that particular value should not exist hence no need to deserialize
  default: any; // default as well, will not be needed because it will be provided after validation

  constructor(type: T, options: DredgeSchemaOptions = {}) {
    this.type = type;
    this.description = options.description || "";
    this.optional = options.optional || false;
    this.default = options.default;
  }
}

export type DredgeSchema =
  | DredgeString
  | DredgeNumber
  | DredgeBoolean
  | DredgeDate
  | DredgeArray
  | DredgeTuple
  | DredgeObject
  | DredgeNull;

export class DredgeNull extends DredgeBaseSchema<"null"> {
  constructor(options: DredgeSchemaOptions = {}) {
    super("null", options);
  }
}

export class DredgeNumber extends DredgeBaseSchema<"number"> {
  constructor(options: DredgeSchemaOptions = {}) {
    super("number", options);
  }
}

export class DredgeString extends DredgeBaseSchema<"string"> {
  constructor(options: DredgeSchemaOptions = {}) {
    super("string", options);
  }
}

export class DredgeBoolean extends DredgeBaseSchema<"boolean"> {
  constructor(options: DredgeSchemaOptions = {}) {
    super("boolean", options);
  }
}

export class DredgeDate extends DredgeBaseSchema<"date"> {
  constructor(options: DredgeSchemaOptions = {}) {
    super("date", options);
  }
}

export class DredgeArray extends DredgeBaseSchema<"array"> {
  innerType: DredgeBaseSchema<any>;

  constructor(
    innerType: DredgeBaseSchema<any>,
    options: DredgeSchemaOptions = {},
  ) {
    super("array", options);
    this.innerType = innerType;
  }
}

export class DredgeTuple extends DredgeBaseSchema<"tuple"> {
  items: DredgeBaseSchema<any>[];

  constructor(
    items: DredgeBaseSchema<any>[],
    options: DredgeSchemaOptions = {},
  ) {
    super("tuple", options);
    this.items = items;
  }
}

export class DredgeObject extends DredgeBaseSchema<"object"> {
  properties: Record<string, DredgeBaseSchema<any>>;

  constructor(
    properties: Record<string, DredgeBaseSchema<any>>,
    options: DredgeSchemaOptions = {},
  ) {
    super("object", options);
    this.properties = properties;
  }
}

export function findSchemaValidator(
  schema: any,
): "zod" | "valibot" | "yup" | "superStruct" | "arktype" | null {
  // zod
  if (schema?._def?.typeName) {
    return "zod";
  }
  // valibot
  if (schema?.type && schema?.kind === "schema") {
    return "valibot";
  }

  // yup
  if (Object.hasOwn(schema, "spec")) {
    return "yup";
  }

  // superStruct
  if (schema?.type) {
    return "superStruct";
  }

  // arktype
  if (schema?.extends) {
    return "arktype";
  }

  return null;
}
export function otherSchemaToDredgeSchema(schema: any): DredgeSchema | null {
  const validator = findSchemaValidator(schema);

  switch (validator) {
    case "zod":
      return zodSchemaToDredgeSchema(schema);
    case "valibot":
      return valibotSchemaToDredgeSchema(schema);
    case "yup":
      return yupSchemaToDredgeSchema(schema);
    case "superStruct":
      return superStructSchemaToDredgeSchema(schema);
    case "arktype":
      return arkTypeSchemaToDredgeSchema(schema);
    default:
      return null;
  }
}

export function zodSchemaToDredgeSchema(schema: any): DredgeSchema | null {
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
    if (!innerType) return null;
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
    if (!items.length) return null;
    return new DredgeTuple(items, options);
  }

  return null;
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

export function superStructSchemaToDredgeSchema(
  schema: any,
): DredgeSchema | null {
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
    if (!innerType) return null;
    return new DredgeArray(innerType, options);
  }

  if (typeName === "tuple") {
    // TODO: implement superStruct tuple to DredgeTuple conversion
    return null;
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

  return null;
}

export function yupSchemaToDredgeSchema(schema: any): DredgeSchema | null {
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
    if (!innerType) return null;
    return new DredgeArray(innerType, options);
  }
  if (typeName === "tuple") {
    const items = schema.spec.types.map((item: any) =>
      yupSchemaToDredgeSchema(item),
    );
    if (!items.length) return null;
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
  return null;
}

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

export function valibotSchemaToDredgeSchema(schema: any): DredgeSchema | null {
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

  return null;
}

export function arkTypeSchemaToDredgeSchema(schema: any): DredgeSchema | null {
  const options = {
    optional: schema.meta.optional,
    default: schema.meta.default,
  };

  if (schema.extends("string")) {
    return new DredgeString(options);
  }
  if (schema.extends("number")) {
    return new DredgeNumber(options);
  }
  if (schema.extends("boolean")) {
    return new DredgeBoolean(options);
  }
  if (schema.extends("Date")) {
    return new DredgeDate(options);
  }
  if (schema.extends("Array")) {
    // TODO: implement arktype array and tuple to DredgeArray and DredgeTuple conversion
    return null;
  }
  if (schema.extends("object")) {
    // TODO: implement arktype object to DredgeObject conversion
    return null;
  }

  return null;
}
