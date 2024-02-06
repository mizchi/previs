import { ChatMessage } from './types.ts';
import { requestNewCode, selectModel } from "./request.ts";
import { buildMarkupper } from "./markupper.ts";

export async function getFixedCode(options: {
  code: string;
  request: string;
  vision: boolean;
  getImage: () => Promise<string>;
  debug?: boolean;
}): Promise<string> {
  const markupper = buildMarkupper();
  const test = undefined;
  const b64image = options.vision ? await options.getImage() : undefined;
  const messages = markupper.fix({
    code: options.code,
    test: test,
    request: options.request,
    oldPrompt: undefined,
    imageUrl: options.vision
      ? b64image
      : undefined,
  });
  return await requestNewCode({
    model: selectModel({ vision: options.vision }),
    vision: options.vision,
    debug: options.debug,
    messages: messages as ChatMessage[],
  });
}

export async function getRetryCode(options: {
  code: string;
  testCommand: string[];
  failedReason: string;
  request: string;
  vision: boolean;
  getImage: () => Promise<string>;
  debug?: boolean;
}): Promise<string> {
  const markupper = buildMarkupper();
  const test = undefined;
  const b64image = options.vision ? await options.getImage() : undefined;
  const messages = markupper.retryWith({
    code: options.code,
    test: test,
    request: options.request,
    testCommand: options.testCommand,
    failedReason: options.failedReason,
    imageUrl: options.vision
      ? b64image
      : undefined,
  });
  return await requestNewCode({
    model: selectModel({ vision: options.vision }),
    vision: options.vision,
    debug: options.debug,
    messages: messages as ChatMessage[],
  });
}


export async function getNewCode(options: {
  target: string;
  request: string;
  printRaw: boolean;
  vision: boolean;
}): Promise<string> {
  const markupper = buildMarkupper();
  const messages = markupper.generate({
    filename: options.target,
    request: options.request,
  });
  const model = selectModel({ vision: options.vision });
  const newCode = await requestNewCode({
    model,
    vision: options.vision,
    printRaw: options.printRaw,
    messages: messages as ChatMessage[],
  });
  return newCode;
}
