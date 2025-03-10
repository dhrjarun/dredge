import {
  DredgeBoolean,
  DredgeDate,
  DredgeNumber,
  DredgeSchema,
  DredgeString,
  DredgeUnknown,
} from "./schema";

export function arkTypeSchemaToDredgeSchema(schema: any): DredgeSchema {
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

  return new DredgeUnknown();
}
