import { OpenAI } from "../deps.ts";

const encoder = new TextEncoder();
const client = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')
});


type ChatMessages = Array<{
  role: 'system' | 'user',
  content: string | Array<{
    type: "text",
    text: string
  } | {
    type: "image",
    image_url: {
      url: string
    }
  }>
}>;

type Options = {
  image: boolean,
  messages: ChatMessages,
  type?: string,
  key?: string,
  skipRaw?: boolean,
  history?: boolean,
  "--": string[],
}

export async function askStreamly(options: Options) {
  const model = options.image ? "gpt-4-vision-preview" : "gpt-4-1106-preview";
  const stream = await client.chat.completions.create({
    // model: "gpt-4-1106-preview",
    model: model,
    messages: options.messages as any,
    stream: true,
    // response_format: {
    //   type: "json_object"
    // }
  });
  if (!options.skipRaw) write('[A] ');

  let result = '';
  for await (const chunk of stream) {
    const out = chunk.choices[0]?.delta?.content ?? '';
    if (!out) continue;
    result += out;
    if (!options.skipRaw) write(out);
  }
  if (!options.skipRaw) write('\n');

  // const outputCode = extractJsonKey(result, "code");
  // console.log(`%c[O] ${outputCode}`, "color: #999");
  const content = extractCodeBlock(result);
  return content;

  function write(str: string) {
    Deno.stdout.writeSync(encoder.encode(str));
  }
}


function extractCodeBlock(str: string) {
  return str.match(/```tsx\n([\s\S]+?)\n```/)?.[1] ?? '';
}
