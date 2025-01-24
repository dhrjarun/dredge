import * as ark from "arktype";
import * as s from "superstruct";
import * as v from "valibot";
import { describe, expect, test } from "vitest";
import * as y from "yup";
import { z } from "zod";
import {
  DredgeArray,
  DredgeBoolean,
  DredgeDate,
  DredgeNumber,
  DredgeObject,
  DredgeString,
  DredgeTuple,
  arkTypeSchemaToDredgeSchema,
  findSchemaValidator,
  superStructSchemaToDredgeSchema,
  valibotSchemaToDredgeSchema,
  yupSchemaToDredgeSchema,
  zodSchemaToDredgeSchema,
} from "../source/dredge-schema";

test("findSchemaValidator", () => {
  expect(findSchemaValidator(z.string())).toBe("zod");
  expect(findSchemaValidator(v.string())).toBe("valibot");
  expect(findSchemaValidator(y.string())).toBe("yup");
  expect(findSchemaValidator(s.string())).toBe("superStruct");
  expect(findSchemaValidator(ark.type("string"))).toBe("arktype");

  expect(findSchemaValidator(z.object({}))).toBe("zod");
  expect(findSchemaValidator(v.object({}))).toBe("valibot");
  expect(findSchemaValidator(y.object({}))).toBe("yup");
  expect(findSchemaValidator(s.object({}))).toBe("superStruct");
  expect(findSchemaValidator(ark.type({}))).toBe("arktype");
});

describe("zod", () => {
  test("converts to DredgeString", () => {
    expect(zodSchemaToDredgeSchema(z.string())).toBeInstanceOf(DredgeString);
    let converted = zodSchemaToDredgeSchema(z.string().optional());
    expect(converted).toBeInstanceOf(DredgeString);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeNumber", () => {
    expect(zodSchemaToDredgeSchema(z.number())).toBeInstanceOf(DredgeNumber);
    let converted = zodSchemaToDredgeSchema(z.number().optional());
    expect(converted).toBeInstanceOf(DredgeNumber);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeBoolean", () => {
    expect(zodSchemaToDredgeSchema(z.boolean())).toBeInstanceOf(DredgeBoolean);
    let converted = zodSchemaToDredgeSchema(z.boolean().optional());
    expect(converted).toBeInstanceOf(DredgeBoolean);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeDate", () => {
    expect(zodSchemaToDredgeSchema(z.date())).toBeInstanceOf(DredgeDate);
    let converted = zodSchemaToDredgeSchema(z.date().optional());
    expect(converted).toBeInstanceOf(DredgeDate);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeArray", () => {
    let converted = zodSchemaToDredgeSchema(z.array(z.string()));
    expect(converted).toBeInstanceOf(DredgeArray);
    expect((converted as DredgeArray).innerType).toBeInstanceOf(DredgeString);

    converted = zodSchemaToDredgeSchema(z.array(z.string()).optional());
    expect(converted).toBeInstanceOf(DredgeArray);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeTuple", () => {
    let converted = zodSchemaToDredgeSchema(z.tuple([z.string(), z.number()]));
    expect(converted).toBeInstanceOf(DredgeTuple);
    expect((converted as DredgeTuple).items[0]).toBeInstanceOf(DredgeString);
    expect((converted as DredgeTuple).items[1]).toBeInstanceOf(DredgeNumber);

    converted = zodSchemaToDredgeSchema(
      z.tuple([z.string(), z.number()]).optional(),
    );
    expect(converted).toBeInstanceOf(DredgeTuple);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeObject", () => {
    let converted = zodSchemaToDredgeSchema(
      z.object({
        name: z.string(),
        age: z.number(),
      }),
    ) as DredgeObject;

    expect(converted).toBeInstanceOf(DredgeObject);
    expect(converted.properties.name).toBeInstanceOf(DredgeString);
    expect(converted.properties.age).toBeInstanceOf(DredgeNumber);

    converted = zodSchemaToDredgeSchema(
      z
        .object({
          name: z.string(),
          age: z.number(),
        })
        .optional(),
    ) as DredgeObject;
    expect(converted).toBeInstanceOf(DredgeObject);
    expect(converted?.optional).toBe(true);
  });
});

describe("valibot", () => {
  test("converts to DredgeString", () => {
    expect(valibotSchemaToDredgeSchema(v.string())).toBeInstanceOf(
      DredgeString,
    );
    let converted = valibotSchemaToDredgeSchema(v.optional(v.string()));
    expect(converted).toBeInstanceOf(DredgeString);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeNumber", () => {
    expect(valibotSchemaToDredgeSchema(v.number())).toBeInstanceOf(
      DredgeNumber,
    );
    let converted = valibotSchemaToDredgeSchema(v.optional(v.number()));
    expect(converted).toBeInstanceOf(DredgeNumber);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeBoolean", () => {
    expect(valibotSchemaToDredgeSchema(v.boolean())).toBeInstanceOf(
      DredgeBoolean,
    );
    let converted = valibotSchemaToDredgeSchema(v.optional(v.boolean()));
    expect(converted).toBeInstanceOf(DredgeBoolean);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeDate", () => {
    expect(valibotSchemaToDredgeSchema(v.date())).toBeInstanceOf(DredgeDate);
    let converted = valibotSchemaToDredgeSchema(v.optional(v.date()));
    expect(converted).toBeInstanceOf(DredgeDate);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeArray", () => {
    let converted = valibotSchemaToDredgeSchema(v.array(v.string()));
    expect(converted).toBeInstanceOf(DredgeArray);
    expect((converted as DredgeArray).innerType).toBeInstanceOf(DredgeString);

    converted = valibotSchemaToDredgeSchema(v.optional(v.array(v.string())));
    expect(converted).toBeInstanceOf(DredgeArray);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeTuple", () => {
    let converted = valibotSchemaToDredgeSchema(
      v.tuple([v.string(), v.number()]),
    );
    expect(converted).toBeInstanceOf(DredgeTuple);
    expect((converted as DredgeTuple).items[0]).toBeInstanceOf(DredgeString);
    expect((converted as DredgeTuple).items[1]).toBeInstanceOf(DredgeNumber);

    converted = valibotSchemaToDredgeSchema(
      v.optional(v.tuple([v.string(), v.number()])),
    );
    expect(converted).toBeInstanceOf(DredgeTuple);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeObject", () => {
    let converted = valibotSchemaToDredgeSchema(
      v.object({
        name: v.string(),
        age: v.number(),
      }),
    ) as DredgeObject;

    expect(converted).toBeInstanceOf(DredgeObject);
    expect(converted.properties.name).toBeInstanceOf(DredgeString);
    expect(converted.properties.age).toBeInstanceOf(DredgeNumber);

    converted = valibotSchemaToDredgeSchema(
      v.optional(
        v.object({
          name: v.string(),
          age: v.number(),
        }),
      ),
    ) as DredgeObject;
    expect(converted).toBeInstanceOf(DredgeObject);
    expect(converted?.optional).toBe(true);
  });
});

describe("yup", () => {
  test("converts to DredgeString", () => {
    expect(yupSchemaToDredgeSchema(y.string())).toBeInstanceOf(DredgeString);
    let converted = yupSchemaToDredgeSchema(y.string().optional());
    expect(converted).toBeInstanceOf(DredgeString);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeNumber", () => {
    expect(yupSchemaToDredgeSchema(y.number())).toBeInstanceOf(DredgeNumber);
    let converted = yupSchemaToDredgeSchema(y.number().optional());
    expect(converted).toBeInstanceOf(DredgeNumber);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeBoolean", () => {
    expect(yupSchemaToDredgeSchema(y.boolean())).toBeInstanceOf(DredgeBoolean);
    let converted = yupSchemaToDredgeSchema(y.boolean().optional());
    expect(converted).toBeInstanceOf(DredgeBoolean);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeDate", () => {
    expect(yupSchemaToDredgeSchema(y.date())).toBeInstanceOf(DredgeDate);
    let converted = yupSchemaToDredgeSchema(y.date().optional());
    expect(converted).toBeInstanceOf(DredgeDate);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeArray", () => {
    let converted = yupSchemaToDredgeSchema(y.array().of(y.string()));
    expect(converted).toBeInstanceOf(DredgeArray);
    expect((converted as DredgeArray).innerType).toBeInstanceOf(DredgeString);

    converted = yupSchemaToDredgeSchema(y.array().of(y.string()).optional());
    expect(converted).toBeInstanceOf(DredgeArray);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeTuple", () => {
    let converted = yupSchemaToDredgeSchema(y.tuple([y.string(), y.number()]));
    expect(converted).toBeInstanceOf(DredgeTuple);
    expect((converted as DredgeTuple).items[0]).toBeInstanceOf(DredgeString);
    expect((converted as DredgeTuple).items[1]).toBeInstanceOf(DredgeNumber);

    converted = yupSchemaToDredgeSchema(
      y.tuple([y.string(), y.number()]).optional(),
    );
    expect(converted).toBeInstanceOf(DredgeTuple);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeObject", () => {
    let converted = yupSchemaToDredgeSchema(
      y.object({
        name: y.string(),
        age: y.number(),
      }),
    ) as DredgeObject;

    expect(converted).toBeInstanceOf(DredgeObject);
    expect(converted.properties.name).toBeInstanceOf(DredgeString);
    expect(converted.properties.age).toBeInstanceOf(DredgeNumber);

    converted = yupSchemaToDredgeSchema(
      y
        .object({
          name: y.string(),
          age: y.number(),
        })
        .optional(),
    ) as DredgeObject;
    expect(converted).toBeInstanceOf(DredgeObject);
    expect(converted?.optional).toBe(true);
  });
});

describe("superstruct", () => {
  test("converts to DredgeString", () => {
    expect(superStructSchemaToDredgeSchema(s.string())).toBeInstanceOf(
      DredgeString,
    );

    let converted = superStructSchemaToDredgeSchema(s.optional(s.string()));
    expect(converted).toBeInstanceOf(DredgeString);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeNumber", () => {
    expect(superStructSchemaToDredgeSchema(s.number())).toBeInstanceOf(
      DredgeNumber,
    );
    let converted = superStructSchemaToDredgeSchema(s.optional(s.number()));
    expect(converted).toBeInstanceOf(DredgeNumber);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeBoolean", () => {
    expect(superStructSchemaToDredgeSchema(s.boolean())).toBeInstanceOf(
      DredgeBoolean,
    );
    let converted = superStructSchemaToDredgeSchema(s.optional(s.boolean()));
    expect(converted).toBeInstanceOf(DredgeBoolean);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeDate", () => {
    expect(superStructSchemaToDredgeSchema(s.date())).toBeInstanceOf(
      DredgeDate,
    );
    let converted = superStructSchemaToDredgeSchema(s.optional(s.date()));
    expect(converted).toBeInstanceOf(DredgeDate);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeArray", () => {
    let converted = superStructSchemaToDredgeSchema(s.array(s.string()));
    expect(converted).toBeInstanceOf(DredgeArray);
    expect((converted as DredgeArray).innerType).toBeInstanceOf(DredgeString);

    converted = superStructSchemaToDredgeSchema(
      s.optional(s.array(s.string())),
    );
    expect(converted).toBeInstanceOf(DredgeArray);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeObject", () => {
    let converted = superStructSchemaToDredgeSchema(
      s.object({
        name: s.string(),
        age: s.number(),
      }),
    ) as DredgeObject;

    expect(converted).toBeInstanceOf(DredgeObject);
    expect(converted.properties.name).toBeInstanceOf(DredgeString);
    expect(converted.properties.age).toBeInstanceOf(DredgeNumber);

    converted = superStructSchemaToDredgeSchema(
      s.optional(
        s.object({
          name: s.string(),
          age: s.number(),
        }),
      ),
    ) as DredgeObject;
    expect(converted).toBeInstanceOf(DredgeObject);
    expect(converted?.optional).toBe(true);
  });
});

describe("arktype", () => {
  test("converts to DredgeString", () => {
    expect(arkTypeSchemaToDredgeSchema(ark.type("string"))).toBeInstanceOf(
      DredgeString,
    );
    let converted = arkTypeSchemaToDredgeSchema(ark.type("string").optional());
    expect(converted).toBeInstanceOf(DredgeString);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeNumber", () => {
    expect(arkTypeSchemaToDredgeSchema(ark.type("number"))).toBeInstanceOf(
      DredgeNumber,
    );
    let converted = arkTypeSchemaToDredgeSchema(ark.type("number").optional());
    expect(converted).toBeInstanceOf(DredgeNumber);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeBoolean", () => {
    expect(arkTypeSchemaToDredgeSchema(ark.type("boolean"))).toBeInstanceOf(
      DredgeBoolean,
    );
    let converted = arkTypeSchemaToDredgeSchema(ark.type("boolean").optional());
    expect(converted).toBeInstanceOf(DredgeBoolean);
    expect(converted?.optional).toBe(true);
  });

  test("converts to DredgeDate", () => {
    expect(arkTypeSchemaToDredgeSchema(ark.type("Date"))).toBeInstanceOf(
      DredgeDate,
    );
    let converted = arkTypeSchemaToDredgeSchema(ark.type("Date").optional());
    expect(converted).toBeInstanceOf(DredgeDate);
    expect(converted?.optional).toBe(true);
  });
});
