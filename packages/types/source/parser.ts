// taken from tRPC codebase
export type ParserZodEsque<Input, DParsedInput> = {
  _input: Input;
  _output: DParsedInput;
};

export type ParserValibotEsque<Input, DParsedInput> = {
  schema: {
    _types?: {
      input: Input;
      output: DParsedInput;
    };
  };
};

export type ParserArkTypeEsque<Input, DParsedInput> = {
  inferIn: Input;
  infer: DParsedInput;
};

export type ParserMyZodEsque<Input> = {
  parse: (input: any) => Input;
};

export type ParserSuperstructEsque<Input> = {
  create: (input: unknown) => Input;
};

export type ParserCustomValidatorEsque<Input> = (
  input: unknown,
) => Promise<Input> | Input;

export type ParserYupEsque<Input> = {
  validateSync: (input: unknown) => Input;
};

export type ParserScaleEsque<Input> = {
  assert(value: unknown): asserts value is Input;
};

export type ParserWithoutInput<Input> =
  | ParserCustomValidatorEsque<Input>
  | ParserMyZodEsque<Input>
  | ParserSuperstructEsque<Input>
  | ParserYupEsque<Input>
  | ParserScaleEsque<Input>;

export type ParserWithInputOutput<Input, DParsedInput> =
  | ParserZodEsque<Input, DParsedInput>
  | ParserValibotEsque<Input, DParsedInput>
  | ParserArkTypeEsque<Input, DParsedInput>;

export type Parser = ParserWithInputOutput<any, any> | ParserWithoutInput<any>;

export type inferParser<DParser extends Parser> =
  DParser extends ParserWithInputOutput<infer $In, infer $Out>
    ? {
        in: $In;
        out: $Out;
      }
    : DParser extends ParserWithoutInput<infer $InOut>
      ? {
          in: $InOut;
          out: $InOut;
        }
      : never;

export type ParseFn<Type> = (value: unknown) => Promise<Type> | Type;

export type inferParserType<P> = P extends ParserWithInputOutput<
  infer _I,
  infer O
>
  ? O
  : P extends ParserWithoutInput<infer T>
    ? T
    : never;
