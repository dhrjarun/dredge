export type DredgeSchemaOptions = {
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
  | DredgeNull
  | DredgeUnknown;

export class DredgeNull extends DredgeBaseSchema<"null"> {
  constructor(options: DredgeSchemaOptions = {}) {
    super("null", options);
  }
}

export class DredgeUnknown extends DredgeBaseSchema<"unknown"> {
  constructor(options: DredgeSchemaOptions = {}) {
    super("unknown", options);
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
