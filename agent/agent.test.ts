import { defineAgent, ok, err, runAgent, stepAgent, chain, initAgent } from "./agent.ts";
import { Agent, AgentError, AgentErrorCode } from "./types.ts";
import { expect } from "https://deno.land/std@0.214.0/expect/mod.ts";

Deno.test("stepAgent: simple", async () => {
  const simple = defineAgent((_init) => {
    return {
      async invoke(input, _options) {
        return `Hello, ${input}`;
      },
      async parse(invoked) {
        const r = invoked.match(/Hello, (\w+)/)?.[1].trim();
        if (r) {
          return r;
        } else {
          throw new AgentError(AgentErrorCode.ParseError, 'No match');
        }
      },
      async validate(parsed) {
        if (parsed[0].toUpperCase() !== parsed[0]) {
          throw new AgentError(AgentErrorCode.ValidationError, 'Not camelcase');
        }
      }
    }
  })({});

  const s0 = await initAgent(simple, "John", {});
  const s1 = await stepAgent(simple, s0);
  expect(s1).toEqual({
    errorCount: 0,
    step: "Invoked",
    input: "John",
    options: {},
    invoked: { ok: true, value: "Hello, John" }
  });

  const s2 = await stepAgent(simple, s1);
  expect(s2).toEqual({
    errorCount: 0,
    step: "Parsed",
    input: "John",
    options: {},
    invoked: { ok: true, value: "Hello, John" },
    parsed: { ok: true, value: "John" },
  });

  const s3 = await stepAgent(simple, s2);
  expect(s3).toEqual({
    errorCount: 0,
    step: "Done",
    input: "John",
    options: {},
    invoked: { ok: true, value: "Hello, John" },
    parsed: { ok: true, value: "John" },
    validated: { ok: true, value: undefined },
  });
});

Deno.test("chain", async () => {
  const a = defineAgent<{}, string, { invoked: string }, { parsed: string }>((_init) => {
    return {
      async invoke(input, _options) {
        return { invoked: input };
      },
      parse(result) {
        return { parsed: result.invoked };
      }
    }
  })({}) as Agent<{}, string, { invoked: string }, { parsed: string }>;

  const b = defineAgent<{}, { parsed: string }, { invoked2: string }, { parsed2: string }>((_init) => {
    return {
      async invoke(input, _options) {
        return { invoked2: input.parsed };
      },
      parse(result) {
        return { parsed2: result.invoked2 };
      }
    }
  })({}) as Agent<{}, { parsed: string }, { invoked2: string }, { parsed2: string }>;

  const c = defineAgent<{}, { xxxx: string }, { invoked2: string }, { parsed2: string }>((_init) => {
    return {
      async invoke(input, _options) {
        return { invoked2: input.xxxx };
      },
    }
  })({});


  const chained = chain(a, b);

  // @ts-expect-error
  const chained2 = chain(a, c);


  // const result1 = await runAgent(simple, "John");
  // expect(result1).toEqual(ok("John"));

  // // parse error
  // const result2 = await runAgent(simple, "");
  // expect(result2).toEqual(err({
  //   code: AgentErrorCode.ParseError,
  //   message: 'No match',
  // }));

  // // validation error
  // const result3 = await runAgent(simple, "john");
  // expect(result3).toEqual(err({
  //   code: AgentErrorCode.ValidationError,
  //   message: 'Not camelcase',
  // }));
});


Deno.test("runAgent: simple", async () => {
  const simple = defineAgent((_init) => {
    return {
      async invoke(input, _options) {
        return `Hello, ${input}`;
      },
      async parse(result) {
        const r = result.match(/Hello, (\w+)/)?.[1].trim();
        if (r) {
          return r;
        } else {
          throw new AgentError(AgentErrorCode.ParseError, 'No match');
        }
      },
      async validate(parsed) {
        if (parsed[0].toUpperCase() !== parsed[0]) {
          throw new AgentError(AgentErrorCode.ValidationError, 'Not camelcase');
        }
      }
    }
  })({});

  const result1 = await runAgent(simple, "John");
  expect(result1).toEqual(ok("John"));

  // parse error
  const result2 = await runAgent(simple, "");
  expect(result2).toEqual(err({
    code: AgentErrorCode.ParseError,
    message: 'No match',
  }));

  // validation error
  const result3 = await runAgent(simple, "john");
  expect(result3).toEqual(err({
    code: AgentErrorCode.ValidationError,
    message: 'Not camelcase',
  }));
});

Deno.test("runAgent: codegen", async () => {
  const codegen = defineAgent<{ maxRetries: number }>((init) => {
    return {
      async invoke(input, options) {
        return `Test
\`\`\`tsx
const x = 1;
\`\`\`
  `;
      },
      async parse(result) {
        const code = extractCodeBlock(result);
        if (code) {
          return code;
        } else {
          throw new AgentError(AgentErrorCode.ParseError, 'No code block found');
        }
      }
    }

    function extractCodeBlock(str: string): string {
      const result = str.match(/```tsx\n([\s\S]+?)\n```/)?.[1] ?? '';
      return result.trim();
      // return prettier.format(result, { parser: "typescript" });
    }
  });

  const writer = codegen({
    maxRetries: 3,
  });
  const result = await runAgent(writer, "const x = 1");
  expect(result).toEqual(ok("const x = 1;"));
});

