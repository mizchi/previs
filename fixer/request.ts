import { OpenAI } from "../deps.ts";
import { AskOptions } from "./types.ts";

export async function requestRefinedCode(options: AskOptions) {
  const apiKey = Deno.env.get('OPENAI_API_KEY') ?? Deno.env.get('PREVIS_OPENAI_API_KEY');
  if (!apiKey) throw new Error("OpenAI API key is not found. You should set OPENAI_API_KEY or PREVIS_OPENAI_API_KEY");
  const client = new OpenAI({ apiKey });
  const encoder = new TextEncoder();
  // select model
  const model = options.image ? "gpt-4-vision-preview" : "gpt-4-1106-preview";
  const stream = await client.chat.completions.create({
    model: model,
    messages: options.messages as any,
    stream: true,
  });
  let result = '';
  for await (const chunk of stream) {
    const out = chunk.choices[0]?.delta?.content ?? '';
    if (!out) continue;
    result += out;
    write(out);
  }
  write('\n');
  // const outputCode = extractJsonKey(result, "code");
  // console.log(`%c[O] ${outputCode}`, "color: #999");
  return extractCodeBlock(result);

  function write(str: string) {
    if (!options.skipRaw) Deno.stdout.writeSync(encoder.encode(str));
  }
  function extractCodeBlock(str: string) {
    return str.match(/```tsx\n([\s\S]+?)\n```/)?.[1] ?? '';
  }
}

