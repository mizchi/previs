import { ChatMessage } from './types.ts';
import { requestCode } from "./request.ts";
import { buildMarkupper } from "./markupper.ts";
import { buildCoder } from "./coder.ts";

export async function getFixedComponent(options: {
  code: string;
  request: string;
  vision: boolean;
  getImage: () => Promise<string>;
  tailwind: boolean;
  library: string;
  // optional
  failedReason?: string;
  model?: string;
  debug?: boolean;
}): Promise<string> {
  const markupper = buildMarkupper({
    tailwind: options.tailwind,
    library: options.library
  });
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
    expectedSize: Array.from(options.code).length
  });
}

export async function getNewComponent(options: {
  target: string;
  request: string;
  vision: boolean;
  tailwind: boolean;
  library: string;
  debug?: boolean;
  model?: string;
}): Promise<string> {
  const markupper = buildMarkupper({
    tailwind: options.tailwind,
    library: options.library
  });

  const messages = markupper.generate({
    filename: options.target,
    request: options.request,
  });
  const newCode = await requestCode({
    model: options.model,
    vision: options.vision,
    debug: options.debug,
    messages: messages as ChatMessage[],
  });
  return newCode;
}

export async function getNewFunction(options: {
  target: string;
  request: string;
  debug?: boolean;
  model?: string;
  vision?: boolean;
}): Promise<string> {
  const coder = buildCoder();
  const messages = coder.generate({
    filename: options.target,
    request: options.request,
  });
  const newCode = await requestCode({
    model: options.model,
    vision: options.vision,
    debug: options.debug,
    messages: messages as ChatMessage[],
  });
  return newCode;
}

export async function getFixedFunction(options: {
  target: string;
  code: string;
  request: string;
  debug: boolean;
  model?: string;
  vision?: boolean;
  failedReason?: string;
}): Promise<string> {
  const coder = buildCoder();
  const messages = coder.fix({
    code: options.code,
    request: options.request,
    failedReason: options.failedReason,
  });
  return await requestCode({
    model: options.model,
    vision: options.vision,
    debug: options.debug,
    messages: messages as ChatMessage[],
    expectedSize: Array.from(options.code).length
  });
}
