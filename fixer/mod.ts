import { ChatMessage } from './types.ts';
import { requestCode } from "./request.ts";
import { buildMarkupper } from "./markupper.ts";
import { buildCoder } from "./coder.ts";
import { ComponentFlag } from "./types.ts";

export type NewOptions = {
  target: string;
  request: string;
  debug?: boolean;
  model?: string;
  printPrompt?: boolean;
}

export interface FixOptions extends NewOptions {
  code: string;
  errorText?: string;
}

export type ViewContext = {
  vision: boolean;
  tailwind: boolean;
  library: string;
  getImage: () => Promise<string>;
}

export async function getFixedComponent(options: FixOptions & ViewContext, flags: ComponentFlag[]): Promise<string> {
  const markupper = buildMarkupper({
    tailwind: options.tailwind,
    library: options.library,
    filename: options.target,
  }, flags);
  const test = undefined;
  const b64image = options.vision ? await options.getImage() : undefined;
  const messages = markupper.fix({
    code: options.code,
    test: test,
    request: options.request,
    imageUrl: options.vision
      ? b64image
      : undefined,
  });
  return await requestCode({
    model: options.model,
    debug: options.debug,
    messages: messages as ChatMessage[],
    printPrompt: options.printPrompt,
    expectedSize: Array.from(options.code).length
  });
}

export async function getNewComponent(options: NewOptions & ViewContext, flags: ComponentFlag[]): Promise<string> {
  const markupper = buildMarkupper({
    tailwind: options.tailwind,
    library: options.library,
    filename: options.target,
  }, flags);

  const messages = markupper.new({
    filename: options.target,
    request: options.request,
  });

  const newCode = await requestCode({
    model: options.model,
    vision: options.vision,
    debug: options.debug,
    printPrompt: options.printPrompt,
    messages: messages as ChatMessage[],
  });
  return newCode;
}


export async function getNewCode(options: NewOptions): Promise<string> {
  const coder = buildCoder();
  const messages = coder.generate({
    filename: options.target,
    request: options.request,
  });
  const newCode = await requestCode({
    model: options.model,
    debug: options.debug,
    printPrompt: options.printPrompt,
    messages: messages as ChatMessage[],
  });
  return newCode;
}

export async function getFixedCode(options: FixOptions): Promise<string> {
  const coder = buildCoder();
  const messages = coder.fix({
    code: options.code,
    request: options.request,
    errorText: options.errorText,
  });
  return await requestCode({
    model: options.model,
    debug: options.debug,
    printPrompt: options.printPrompt,
    messages: messages as ChatMessage[],
    expectedSize: Array.from(options.code).length
  });
}

