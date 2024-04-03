// zod / typeschema
export type ParserZodEsque<TInput, TParsedInput> = {
  _input: TInput;
  _output: TParsedInput;
};

export type ParserMyZodEsque<TInput> = {
  parse: (input: any) => TInput;
};

export type ParserSuperstructEsque<TInput> = {
  create: (input: unknown) => TInput;
};

export type ParserCustomValidatorEsque<TInput> = (
  input: unknown
) => Promise<TInput> | TInput;

export type ParserYupEsque<TInput> = {
  validateSync: (input: unknown) => TInput;
};

export type ParserScaleEsque<TInput> = {
  assert(value: unknown): asserts value is TInput;
};

export type ParserWithoutInput<TInput> =
  | ParserCustomValidatorEsque<TInput>
  | ParserMyZodEsque<TInput>
  | ParserScaleEsque<TInput>
  | ParserSuperstructEsque<TInput>
  | ParserYupEsque<TInput>;

export type ParserWithInputOutput<TInput, TParsedInput> = ParserZodEsque<
  TInput,
  TParsedInput
>;

export type Parser = ParserWithInputOutput<any, any> | ParserWithoutInput<any>;

export type inferParserType<P> = P extends ParserWithoutInput<infer T>
  ? T
  : P extends ParserWithInputOutput<infer TI, infer TO>
  ? TO
  : never;

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
