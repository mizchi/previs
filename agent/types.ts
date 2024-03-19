export type Promiseable<T> = T | Promise<T>;
export type Result<T, E = string> = Ok<T> | Err<E>;
export type Ok<T = {}> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };

export const enum AgentErrorCode {
  InvokeError = 'InvokeError',
  ParseError = 'ParseError',
  ValidationError = 'ValidationError',
}


export class AgentError extends Error {
  constructor(public code: AgentErrorCode, message: string, public rollbackTo?: AgentStateStep) {
    super(message);
  }
}


export const enum RuntimeErrorCode {
  NotExists = 'NotExists',
}

export class RuntimeError extends Error {
  constructor(public code: RuntimeErrorCode, message: string, public rollbackTo?: AgentStateStep) {
    super(message);
  }
}

export const enum AgentStateStep {
  Initialized = 'Initialized',
  Invoked = 'Invoked',
  Validated = 'Validated',
  Parsed = 'Parsed',
  Done = 'Done',
}

export type ValidationError = {
  code: AgentErrorCode.ValidationError;
  message: string;
  rollbackTo?: AgentStateStep;
};

export type ParseError = {
  code: AgentErrorCode.ParseError;
  message: string;
};

export type InvokeError = {
  code: AgentErrorCode.InvokeError;
  message: string;
}

// export type AgentError = ValidationError | ParseError | InvokeError;
export type AgentInvokeOptions<Options, E> = {
  signal?: AbortSignal;
  override?: Partial<Options>;
};

export type AgentState<
  Options,
  Input,
  Invoked,
  Parsed,
> = {
  errorCount: number;
  input: Input;
  step: AgentStateStep;
  invoked?: Result<Invoked, InvokeError>;
  parsed?: Result<Parsed, ParseError>;
  validated?: Result<void, ValidationError>
  options: Options;
};

export type Agent<
  Options,
  Input,
  Invoked,
  Parsed,
> = {
  description?: string;
  init?: (input: Input, options: Options) => Promiseable<
    AgentState<Options, Input, Invoked, Parsed>
  >;
  step?: (state: AgentState<Options, Input, Invoked, Parsed>) => Promiseable<AgentState<Options, Input, Invoked, Parsed>>;
  invoke(input: Input, options: AgentInvokeOptions<Options, any>, context?: {
    invoked?: Result<Invoked, InvokeError>;
    parsed?: Result<Parsed, ParseError>;
    validated?: Result<void, ValidationError>
  }): Promiseable<Invoked>;
  parse?(invoked: Invoked): Promiseable<Parsed>;
  validate?(parsed: Parsed): Promiseable<void>;
};

export type AgentBuilder<
  Options,
  Input,
  Invoked,
  Parsed,
> = (init: Options) => Agent<Options, Input, Invoked, Parsed>;
