import { arkTypeSchemaToDredgeSchema } from "./arktype";
import { DredgeSchema, DredgeUnknown } from "./schema";
import { superStructSchemaToDredgeSchema } from "./superstruct";
import { valibotSchemaToDredgeSchema } from "./valibot";
import { yupSchemaToDredgeSchema } from "./yup";
import { zodSchemaToDredgeSchema } from "./zod";

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

export function convertToDredgeSchema(schema: any): DredgeSchema {
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
      return new DredgeUnknown();
  }
}
