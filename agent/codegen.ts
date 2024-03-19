import { defineAgent } from "./agent.ts";
import { tpl } from "../template/tpl.ts";
import { AgentError, AgentErrorCode } from "./types.ts";

type CodegenOptions = {
  apiKey: string;
  model: string;
  maxRetries: number;
  max_tokens?: number;
};

const systemTemplate = tpl`
You are a world class technical documentation writer.
`;

export const codegen = defineAgent<CodegenOptions>((init) => {
  return {
    description: 'OpenAI GPT-3.5 code writer',
    async invoke(input, options) {
      let out = '';
      const finalOptions = {
        ...init,
        ...options.override,
      };
      const system = systemTemplate(finalOptions);
      const iter = streamOpenAI({
        ...finalOptions,
        messages: [
          { role: "system", content: system },
          { role: "user", content: input },
        ],
      });
      try {
        for await (const result of iter) {
          out += result;
        }
        return out;
      } catch (e) {
        throw new AgentError(AgentErrorCode.InvokeError, e.message);
      }
    },
    async parse(invoked) {
      const code = extractCodeBlock(invoked);
      if (code) {
        return code;
      } else {
        throw new AgentError(AgentErrorCode.ParseError, 'No code block found');
      }
    }
  }
});


function extractCodeBlock(str: string): string {
  const result = str.match(/```tsx\n([\s\S]+?)\n```/)?.[1] ?? '';
  return result;
  // return prettier.format(result, { parser: "typescript" });
}

async function* streamOpenAI(options: {
  model: string;
  apiKey: string;
  messages: { role: string; content: string }[];
  signal?: AbortSignal;
}): AsyncGenerator<string, void, void> {
  const max_tokens = options.model === 'gpt-4-vision-preview' ? 4096 : null;

  // console.log('model', options.model, 'max_tokens:', max_tokens);
  const completion = await fetch("https://api.openai.com/v1/chat/completions", {
    signal: options.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.apiKey}`,
    },
    method: "POST",
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      max_tokens,
      stream: true,
    }),
  });

  const reader = completion.body?.getReader();
  if (completion.status !== 200 || !reader) return;

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      reader.releaseLock();
      break;
    }

    // TODO: memory leak with stream options in deno
    // const data = decoder.decode(value, { stream: true });
    const data = decoder.decode(value);
    const response = data
      .split("data:")
      .map((data) => {
        const trimData = data.trim();
        if (trimData === "") return undefined;
        if (trimData === "[DONE]") return undefined;
        try {
          return JSON.parse(data.trim());
        } catch (e) {
          console.log(e, data);
        }
      })
      .filter((data) => data);
    for (const message of response ?? []) {
      for (const choice of message?.choices) {
        yield choice.delta.content;
      }
    }
  }
  return;
}

// if (import.meta.main) {
//   const apiKey = Deno.env.get("OPENAI_API_KEY");
//   if (!apiKey) {
//     console.error("OPENAI_API_KEY not set");
//     Deno.exit(1);
//   }
//   const model = "gpt-3.5-turbo-1106";
//   const agent = codeWriter({
//     apiKey,
//     model,
//     maxRetries: 3,
//   });
//   const result = await runAgent(agent, "const x = 1");
//   console.log(result);
// }