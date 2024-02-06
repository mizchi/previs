import { readFile } from 'node:fs/promises';
import { OpenAI, prettier, Spinner } from "../deps.ts";
import { ChatMessage } from "./types.ts";

type RequestOptions = {
  vision?: boolean,
  model?: string,
  messages: ChatMessage[],
  type?: string,
  key?: string,
  printRaw?: boolean,
  history?: boolean,
  onProgress?: (state: string) => void,
  debug?: boolean,
}

const defaultModel = "gpt-4-1106-preview";

export function selectModel(opts: { vision?: boolean }) {
  return opts.vision ? 'gpt-4-vision-preview' : "gpt-4-1106-preview";
}

export async function requestNewCode(options: RequestOptions) {
  const apiKey = getApiKey();
  const client = new OpenAI({ apiKey });
  const encoder = new TextEncoder();

  const stream = await client.chat.completions.create({
    model: options.model ?? defaultModel,
    // @ts-ignore - `messages` is not in the type definition
    messages: options.messages,
    max_tokens: options.model === 'gpt-4-vision-preview' ? 4096 : null,
    stream: true,
  });


  // TODO: Refactor to other file
  let spinner: ReturnType<typeof Spinner.getInstance> | null = null;
  if (!options.printRaw) {
    spinner = Spinner.getInstance();
    spinner.start('generating...');
    spinner.setSpinnerType('dots8');
  }
  let result = '';
  for await (const chunk of stream) {
    for (const choice of chunk.choices ?? []) {
      const out = choice.delta?.content ?? '';
      if (!out) continue;
      result += out;
      write(out);
      spinner?.setText(`generating... ${result.length}`);
      options.onProgress?.(out);
    }
  }
  write('\n');
  if (!options.printRaw && spinner) {
    spinner.stop();
  }

  // console.log('result', JSON.stringify(xs, null, 2));
  const code = extractCodeBlock(result);
  if (!code) {
    throw new Error("Failed to generate code");
  }
  return code;

  function write(str: string) {
    if (options.printRaw) Deno.stdout.writeSync(encoder.encode(str));
  }
  function extractCodeBlock(str: string) {
    const result = str.match(/```tsx\n([\s\S]+?)\n```/)?.[1] ?? '';
    return prettier.format(result, { parser: "typescript" });
  }
}

function getApiKey() {
  const apiKey = Deno.env.get('OPENAI_API_KEY') ?? Deno.env.get('PREVIS_OPENAI_API_KEY');
  if (!apiKey) throw new Error("OpenAI API key is not found. You should set OPENAI_API_KEY or PREVIS_OPENAI_API_KEY");
  return apiKey;
}

Deno.test("with image", async () => {
  const apiKey = getApiKey();
  if (!apiKey) return;
  const b64image = await readFile(new URL("../ss.png", import.meta.url)).then((buf) => buf.toString("base64"));
  const result = await requestNewCode({
    vision: true,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image_url: {
              url: `data:image/png;base64,${b64image}`
            }
          },
          {
            type: "text",
            text: `describe the image above.
            Return the description of the image in a json format: { "description": string}
            `,
          }
        ],
      },
    ],
    printRaw: true,
  });
  console.log(result);
  // assertEquals(result, "const a = 1;\n");
});

// Deno.test("with image", async () => {
//   const apiKey = getApiKey();
//   if (!apiKey) return;

//   const model = selectModel({ vision: true });
//   const messages = JSON.parse(await readFile(new URL("__fixtures__/out.json", import.meta.url)).then((buf) => buf.toString()));
//   const result = await requestNewCode({
//     printRaw: true,
//     model,
//     vision: true,
//     messages: messages
//   });
//   console.log(result);
//   // assertEquals(result, "const a = 1;\n");
// });