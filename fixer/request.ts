import { prettier, Spinner } from "../deps.ts";
import { ChatMessage } from "./types.ts";
import { streamOpenAI } from "./openai_helper.ts";

// pure fetch impl of requestToOpenAI
type RequestCodeOptions = {
  messages: ChatMessage[],
  // optional
  model?: string,
  vision?: boolean,
  apiKey?: string,
  debug?: boolean,
  expectedSize?: number,
  printPrompt?: boolean,
}

const GPT_4_VISION_MODEL = 'gpt-4-vision-preview';
const GPT_4_TURBO_PREVIEW_MODEL = 'gpt-4-turbo-preview';
// const GPT_4_PREVIEW_MODEL = 'gpt-4-1106-preview';

export function inferModel(options: {
  messages: ChatMessage[],
  vision?: boolean,
}) {
  if (options.vision) return GPT_4_VISION_MODEL;
  const hasImage = options.messages.some(m => Array.isArray(m.content));
  if (hasImage) return GPT_4_VISION_MODEL;
  return GPT_4_TURBO_PREVIEW_MODEL;
}

export async function requestCode(options: RequestCodeOptions) {
  const apiKey = options.apiKey ?? getApiKey();
  const model = options.model ?? inferModel({ messages: options.messages, vision: options.vision });
  if (options.printPrompt) {
    console.log("model:", model);
    printPrompt(options.messages);
  }
  let spinner: ReturnType<typeof Spinner.getInstance> | null = null;
  if (!options.debug) {
    spinner = Spinner.getInstance();
    spinner.start('generating...');
    spinner.setSpinnerType('dots8');
  }
  let raw = '';

  const controller = new AbortController();
  const handler = () => {
    console.log('SIGINT received, stopping...');
    spinner?.stop();
    Deno.removeSignalListener('SIGINT', handler);
    controller.abort();
  }
  Deno.addSignalListener('SIGINT', handler);
  for await (const input of streamOpenAI({ ...options, model, apiKey, signal: controller.signal })) {
    raw += input;
    if (options.debug) {
      await Deno.stdout.write(new TextEncoder().encode(input));
    }
    spinner?.setText(`generating... ${raw.length} ${options.expectedSize ? `| ${options.expectedSize} (expected)` : ''}`);
  }
  if (options.debug) {
    await Deno.stdout.write(new TextEncoder().encode('\n'));
  }
  await spinner?.stop();
  Deno.removeSignalListener('SIGINT', handler);
  // TODO: validate
  return extractCodeBlock(raw);
}

function getApiKey() {
  const apiKey = Deno.env.get('OPENAI_API_KEY') ?? Deno.env.get('PREVIS_OPENAI_API_KEY');
  if (!apiKey) throw new Error("OpenAI API key is not found. You should set OPENAI_API_KEY or PREVIS_OPENAI_API_KEY");
  return apiKey;
}

function extractCodeBlock(str: string): string {
  const result = str.match(/```tsx\n([\s\S]+?)\n```/)?.[1] ?? '';
  return prettier.format(result, { parser: "typescript" });
}

function printPrompt(messages: ChatMessage[]) {
  for (const message of messages) {
    console.log(`------- role:${message.role} -------`);
    if (Array.isArray(message.content)) {
      for (const c of message.content) {
        if (c.type === 'image') {
          console.log("<base64image>");
        } else {
          console.log('%c' + c.text, 'color: gray');
        }
      }
    } else {
      console.log('%c' + message.content, 'color: gray');
    }
  }
}

