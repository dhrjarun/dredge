import { z } from "zod";

// zod / typeschema
export type ParserZodEsque<Input, ParsedInput, Current = Input> = {
  _input: Input;
  _output: ParsedInput;
  _current: Current;
};

export type ParserMyZodEsque<Input, Current = Input> = {
  parse: (input: any) => Input;
  _current: Current;
};

export type ParserSuperstructEsque<Input, Current = Input> = {
  create: (input: unknown) => Input;
  _current: Current;
};

export type ParserCustomValidatorEsque<Input, Current = Input> = {
  (input: unknown): Promise<Input> | Input;
  _current: Current;
};

export type ParserYupEsque<Input, Current = Input> = {
  validateSync: (input: unknown) => Input;
  _current: Current;
};

export type ParserScaleEsque<Input, Current = Input> = {
  assert(value: unknown): asserts value is Input;
  _current: Current;
};

export type ParserWithoutInput<TInput, Current = TInput> =
  | ParserCustomValidatorEsque<TInput, Current>
  | ParserMyZodEsque<TInput, Current>
  | ParserScaleEsque<TInput, Current>
  | ParserSuperstructEsque<TInput, Current>
  | ParserYupEsque<TInput, Current>;

export type ParserWithInputOutput<
  TInput,
  TParsedInput,
  Current = TInput,
> = ParserZodEsque<TInput, TParsedInput, Current>;

export type Parser = ParserWithInputOutput<any, any> | ParserWithoutInput<any>;

export type inferParserType<P> = P extends ParserWithoutInput<infer T>
  ? T
  : P extends ParserWithInputOutput<infer TI, infer TO>
    ? TO
    : never;

export type inferCurrentData<P> = P extends { _current: infer C } ? C : never;

export type inferParser<TParser extends Parser> =
  TParser extends ParserWithInputOutput<infer $TIn, infer $TOut>
    ? {
        in: $TIn;
        out: $TOut;
      }
    : TParser extends ParserWithoutInput<infer $InOut>
      ? {
          in: $InOut;
          out: $InOut;
        }
      : never;

export type ParseFn<TType> = (value: unknown) => Promise<TType> | TType;

export function getParseFn<TType>(procedureParser: Parser): ParseFn<TType> {
  const parser = procedureParser as any;

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
