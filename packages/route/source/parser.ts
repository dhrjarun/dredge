// taken from tRPC codebase
import { ParseFn, Parser } from "dredge-types";

export function getParseFn<TType>(procedureParser: Parser): ParseFn<TType> {
  const parser = procedureParser as any;
  if (typeof parser === "function" && typeof parser.assert === "function") {
    // ParserArkTypeEsque - arktype schemas shouldn't be called as a function because they return a union type instead of throwing
    return parser.assert.bind(parser);
  }

  if (typeof parser === "function") {
    // ParserCustomValidatorEsque
    return parser;
  }

  if (typeof parser.parseAsync === "function") {
    // ParserZodEsque
    return parser.parseAsync.bind(parser);
  }

  if (typeof parser.parse === "function") {
    // ParserZodEsque
    // ParserValibotEsque (<= v0.12.X)
    return parser.parse.bind(parser);
  }

  if (typeof parser.validateSync === "function") {
    // ParserYupEsque
    return parser.validateSync.bind(parser);
  }

  if (typeof parser.create === "function") {
    // ParserSuperstructEsque
    return parser.create.bind(parser);
  }

  if (typeof parser.assert === "function") {
    // ParserScaleEsque
    return (value) => {
      parser.assert(value);
      return value as TType;
    };
  }

  throw new Error("Could not find a validator fn");
}
