import { readFile } from 'node:fs/promises';
import { ChatMessage } from "./types.ts";

export function selectModel(opts: { vision?: boolean }) {
  return opts.vision ? 'gpt-4-vision-preview' : "gpt-4-1106-preview";
}

// pure fetch impl of requestToOpenAI
export type RequestOpenAIOptions = {
  model: string,
  apiKey: string,
  messages: ChatMessage[],
  signal?: AbortSignal,
  debug?: boolean,
}

export async function* streamOpenAI(options: RequestOpenAIOptions): AsyncGenerator<string, void, void> {
  const max_tokens = options.model === 'gpt-4-vision-preview' ? 4096 : null;
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

Deno.test("with image", async () => {
  // const apiKey = getApiKey();
  // if (!apiKey) return;
  const apiKey = Deno.env.get("PREVIS_OPENAI_API_KEY")!;
  const encoder = new TextEncoder();
  const b64image = await readFile(new URL("../ss.png", import.meta.url)).then((buf) => buf.toString("base64"));
  for await (const item of streamOpenAI({
    model: selectModel({ vision: true }),
    apiKey,
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
  })) {
    Deno.stdout.writeSync(encoder.encode(item));
    // console.log(message);
  }

  Deno.stdout.writeSync(encoder.encode('\n'));
  // const result = await requestToOpenAI({
  //   model: selectModel({ vision: true }),
  //   messages: [
  //     {
  //       role: "user",
  //       content: [
  //         {
  //           type: "image",
  //           image_url: {
  //             url: `data:image/png;base64,${b64image}`
  //           }
  //         },
  //         {
  //           type: "text",
  //           text: `describe the image above.
  //           Return the description of the image in a json format: { "description": string}
  //           `,
  //         }
  //       ],
  //     },
  //   ],
  // });
  // console.log(result);
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