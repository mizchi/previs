import { OpenAI } from "../deps.ts";
import { AskOptions } from "./types.ts";
import Spinner from 'https://deno.land/x/cli_spinners@v0.0.2/mod.ts';
import { prettier } from "../deps.ts";

export async function requestRefinedCode(options: AskOptions) {
  const apiKey = getApiKey();
  const client = new OpenAI({ apiKey });
  const encoder = new TextEncoder();
  // select model
  const model = options.image ? "gpt-4-vision-preview" : "gpt-4-1106-preview";
  const stream = await client.chat.completions.create({
    model: model,
    messages: options.messages as any,
    stream: true,
  });
  let spinner;
  if (!options.printRaw) {
    spinner = Spinner.getInstance();
    spinner.start('generating...');
    spinner.setSpinnerType('dots8');
    spinner.setText('generating...');
  }
  let result = '';
  for await (const chunk of stream) {
    const out = chunk.choices[0]?.delta?.content ?? '';
    if (!out) continue;
    result += out;
    write(out);
  }
  write('\n');
  if (!options.printRaw && spinner) {
    spinner.stop();
  }
  return extractCodeBlock(result);

  function write(str: string) {
    if (options.printRaw) Deno.stdout.writeSync(encoder.encode(str));
  }
  function extractCodeBlock(str: string) {
    const result = str.match(/```tsx\n([\s\S]+?)\n```/)?.[1] ?? '';
    return prettier.format(result, { parser: "typescript" });
  }

  function getApiKey() {
    const apiKey = Deno.env.get('OPENAI_API_KEY') ?? Deno.env.get('PREVIS_OPENAI_API_KEY');
    if (!apiKey) throw new Error("OpenAI API key is not found. You should set OPENAI_API_KEY or PREVIS_OPENAI_API_KEY");
    return apiKey;
  }
}

