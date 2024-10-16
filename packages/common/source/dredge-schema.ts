type DredgeSchemaOptions = {
  description?: string;
  optional?: boolean;
  nullable?: boolean;
  default?: any;
};

export class DredgeSchema {
  readonly type: string;
  description: string;
  optional: boolean; // information of optional is not needed to deserialize because, that particular value should not exist hence no need to deserialize
  nullable: boolean; // nullable will not be supported by param and searhParams
  default: any; // default as well, will not be needed because it will be provided after validation, but may need in case to error middleware

  constructor(type: string, options: DredgeSchemaOptions = {}) {
    this.type = type;
    this.description = options.description || "";
    this.optional = options.optional || false;
    this.nullable = options.nullable || false;
    this.default = options.default;
  }
}

export class DredgeNumber extends DredgeSchema {
  type = "number";

  constructor(options: DredgeSchemaOptions = {}) {
    super("number", options);
  }
}

export class DredgeString extends DredgeSchema {
  type = "string";

  constructor(options: DredgeSchemaOptions = {}) {
    super("string", options);
  }
}

export class DredgeBoolean extends DredgeSchema {
  type = "boolean";

  constructor(options: DredgeSchemaOptions = {}) {
    super("boolean", options);
  }
}

export class DredgeDate extends DredgeSchema {
  type = "date";

  constructor(options: DredgeSchemaOptions = {}) {
    super("date", options);
  }
}

export class DredgeArray extends DredgeSchema {
  type = "array";
  innerType: DredgeSchema;

  constructor(innerType: DredgeSchema, options: DredgeSchemaOptions = {}) {
    super("array", options);
    this.innerType = innerType;
  }
}

export class DredgeTuple extends DredgeSchema {
  type = "tuple";
  items: DredgeSchema;

  constructor(items: DredgeSchema, options: DredgeSchemaOptions = {}) {
    super("array", options);
    this.items = items;
  }
}

export class DredgeObject extends DredgeSchema {
  type = "object";
  properties: Record<string, DredgeSchema>;

  constructor(
    properties: Record<string, DredgeSchema>,
    options: DredgeSchemaOptions = {},
  ) {
    super("object", options);
    this.properties = properties;
  }
}

export function otherSchemaToDredgeSchema(schema: any): DredgeSchema | null {
  // zod
  if (schema?._def?.typeName) {
    return zodSchemaToDredgeSchema(schema);
  }
  // valibot
  if (schema.type && schema.kind === "schema") {
    return valibotSchemaToDredgeSchema(schema);
  }

  // yup
  if (schema.type && typeof schema?.optional === "boolean") {
    return yupSchemaToDredgeSchema(schema);
  }

  // superStruct
  if (schema.type) {
    return superStructSchemaToDredgeSchema(schema);
  }

  if (schema.extends) {
    return arkTypeSchemaToDredgeSchema(schema);
  }

  return null;
}

function zodSchemaToDredgeSchema(schema: any): DredgeSchema | null {
  const { schema: _schema, ...options } = handleZodInnerTypes(schema);
  const type = _schema._def.typeName;

  if (type === "ZodString") {
    return new DredgeString(options);
  }
  if (type === "ZodNumber") {
    return new DredgeNumber(options);
  }
  if (type === "ZodBoolean") {
    return new DredgeBoolean(options);
  }
  if (type === "ZodDate") {
    return new DredgeDate(options);
  }

  return null;
}

function handleZodInnerTypes(
  schema: any,
  options: { nullable?: boolean; optional?: boolean; default?: any } = {},
): { schema: any } & DredgeSchemaOptions {
  const type = schema._def.typeName as keyof typeof typeMap;

  const typeMap = {
    ZodOptional: "optional",
    ZodNullable: "nullable",
    ZodDefault: "default",
  };

  if (type in typeMap) {
    const innerSchema = schema._def.innerType;

    const t = typeMap[type];

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

function superStructSchemaToDredgeSchema(schema: any): DredgeSchema | null {
  const type = schema.type;
  const options = {
    nullable: schema?.validator?.(null) === true,
    optional: schema?.validator?.(undefined) === true,
    default: schema?.default,
  };

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

  return null;
}

function yupSchemaToDredgeSchema(schema: any): DredgeSchema | null {
  const type = schema.type;
  const options = {
    nullable: !!schema?.nullable,
    optional: !!schema?.optional,
    default: schema?.default,
  };

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

function valibotSchemaToDredgeSchema(schema: any): DredgeSchema | null {
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

  return null;
}

export function arkTypeSchemaToDredgeSchema(schema: any): DredgeSchema | null {
  const options = {
    nullable: false,
    optional: schema.meta.optional,
  };

  if (schema.extends("string")) {
    return new DredgeString();
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

  return null;
}
