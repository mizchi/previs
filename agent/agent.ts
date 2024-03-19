import { Agent, AgentBuilder, AgentError, AgentState, AgentStateStep, Err, InvokeError, Ok, ParseError, Result, AgentErrorCode } from "./types.ts";

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<T>(error: T): Err<T> {
  return { ok: false, error };
}

export async function initAgent<
  Options,
  Input,
  Invoked,
  Parsed,
>(
  agent: Agent<Options, Input, Invoked, Parsed>,
  input: Input,
  options: Options,
): Promise<AgentState<Options, Input, Invoked, Parsed>> {
  if (agent.init) {
    return await agent.init(input, options);
  }
  // return {} as any;
  const state: AgentState<Options, Input, Invoked, Parsed> = {
    errorCount: 0,
    step: AgentStateStep.Initialized,
    input,
    options,
  };
  return state;
}

export async function stepAgent<
  Options,
  Input,
  Invoked,
  Parsed,
>(
  agent: Agent<Options, Input, Invoked, Parsed>,
  state: AgentState<Options, Input, Invoked, Parsed>,
): Promise<AgentState<Options, Input, Invoked, Parsed>> {
  if (agent.step) {
    return await agent.step(state);
  }

  const newState = {
    ...state,
  };
  switch (state.step) {
    case AgentStateStep.Initialized: {
      // Initialized => Invoke
      const ctx = {
        invoked: state.invoked,
        parsed: state.parsed,
        validated: state.validated,
      };
      try {
        const invoked = await agent.invoke(state.input, { signal: undefined }, ctx);
        newState.step = AgentStateStep.Invoked;
        newState.invoked = ok(invoked);
        return newState;
      } catch (err) {
        newState.invoked = err({
          code: AgentErrorCode.InvokeError,
          message: err.message,
        });
        newState.errorCount++;
        return newState;
      }
    }
    case AgentStateStep.Invoked: {
      // Invoke => Parse
      const invoked = state.invoked!;
      // console.log({ invoked });
      // if (!invoked) {
      //   throw new Error('Invalid state');
      // }
      // if (!agent.parse) {
      //   newState.step = AgentStateStep.Done;
      //   newState.parsed = ok(invoked);
      //   return newState;
      // }
      try {
        if (!agent.parse) throw new Error('No parse');
        if (!invoked.ok) throw new Error('Not ok');
        const parsed = await agent.parse!(invoked!.value);
        newState.step = AgentStateStep.Parsed;
        newState.parsed = ok(parsed);
        return newState;
      } catch (error) {
        if (error instanceof AgentError && error.code === AgentErrorCode.ParseError) {
          newState.parsed = err({
            code: AgentErrorCode.ParseError,
            message: error.message,
          });
          newState.errorCount++;
          newState.step = error.rollbackTo ?? AgentStateStep.Initialized;
          return newState;
        }
        throw error;
      }
    }

    case AgentStateStep.Parsed: {
      // Parse => Validate
      const parsed = state.parsed!;
      if (!parsed!.ok) {
        throw new Error('Invalid state in Parsed');
      }
      if (!agent.validate) {
        newState.step = AgentStateStep.Done;
        newState.validated = ok(undefined);
        return newState;
      }
      try {
        await agent.validate(parsed.value);
        newState.step = AgentStateStep.Done;
        newState.validated = ok(undefined);
        return newState;
      } catch (error) {
        if (error instanceof AgentError) {
          newState.validated = err({
            code: AgentErrorCode.ValidationError,
            message: error.message,
          });
          newState.errorCount++;
          newState.step = error.rollbackTo ?? AgentStateStep.Initialized;
          return newState;
        }
        throw error;
      }
    }
  }
  return state;
}

type RunOptions = {
  maxRetries?: number;
}

export async function runAgent<
  Options,
  Input,
  Invoked,
  Parsed,
>(
  agent: Agent<Options, Input, Invoked, Parsed>,
  input: Input,
  options: RunOptions = {},
): Promise<Result<Parsed, AgentError>> {
  let state = await initAgent(agent, input, {} as Options);
  const maxRetries = options.maxRetries ?? 3;
  while (state.step !== AgentStateStep.Done) {
    state = await stepAgent(agent, state);
    // TODO: fix
    if (state.errorCount > maxRetries) {
      // console.log({ state });
      // throw new Error('Too many retries');
      if (state.validated && state.validated?.ok === false) return state.validated! as any;
      if (state.parsed && state.parsed?.ok === false) return state.parsed! as any;
      if (state.invoked && state.invoked?.ok === false) return state.invoked! as any;
      break;
    }
    if (state.step === AgentStateStep.Done && state.parsed) {
      return state.parsed as Result<Parsed, AgentError>;
    }
    // else {
    //   console.log({ state });
    //   throw new Error('Invalid state in runAgent');
    // }
  }
  throw new Error('Invalid state');
}

export function defineAgent<
  Options = {},
  Input = string,
  Invoked = Input,
  Parsed = Invoked,
>(agentFn: (options: Options) => Agent<Options, Input, Invoked, Parsed>): AgentBuilder<Options, Input, Invoked, Parsed> {
  return (options: Options) => agentFn(options);
}

export function chain_<
  // FirstInput,
  // FirstInvoked,
  // FirstParsed,
  // LastInvoked,
  // LastParsed,
  A extends Agent<any, any, any, any>,
  B extends Agent<any, any, any, any>,
  FirstInput = A extends Agent<any, infer FirstInput, any, any> ? FirstInput : never,
// LastParsed = B extends Agent<any, any, any, infer LastParsed> ? LastParsed : never,
>(
  a: A,
  b: B,
  options: RunOptions = {},
) {
  return async (input: FirstInput) => {
    const result = await runAgent(a, input);
    if (!result.ok) return result;
    return runAgent(b, result.value, options);
  }
}


// export function chain<
//   FirstInput,
//   FirstParsed,
//   SecondParsed,
// >(
//   a: Agent<any, FirstInput, any, FirstParsed>,
//   b: Agent<any, FirstParsed, any, SecondParsed>,
//   options: RunOptions = {},
// ): (input: FirstInput) => Promise<Result<SecondParsed, AgentError>> {
//   return async (input: FirstInput) => {
//     const result = await runAgent(a, input);
//     if (!result.ok) return result;
//     return await runAgent(b, result.value, options);
//   }
// }

export function chain<
  A extends Agent<any, any, any, any>,
  B extends Agent<any, A extends Agent<any, any, any, infer FirstParsed> ? FirstParsed : never, any, any>,
>(
  a: A,
  b: B,
  options: RunOptions = {},
): (input: A extends Agent<any, infer FirstInput, any, any> ? FirstInput : never) => Promise<
  Result<B extends Agent<any, any, any, infer SecondParsed> ? SecondParsed : never, AgentError>
> {
  return async (input) => {
    const result = await runAgent(a, input);
    if (!result.ok) return result;
    return await runAgent(b, result.value, options);
  }
}

