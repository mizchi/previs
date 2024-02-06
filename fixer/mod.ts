import { ChatMessage } from './types.ts';
import { requestNewCode, selectModel } from "./request.ts";
import { buildMarkupper } from "./markupper.ts";
import { buildCoder } from "./coder.ts";

export async function getFixedComponent(options: {
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

export async function getRetriedComponent(options: {
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

export async function getNewComponent(options: {
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

export async function getNewFunction(options: {
  target: string;
  request: string;
  debug: boolean;
}): Promise<string> {
  const coder = buildCoder();
  const messages = coder.generate({
    filename: options.target,
    request: options.request,
  });
  const model = selectModel({ vision: false });
  const newCode = await requestNewCode({
    model: model,
    vision: false,
    debug: options.debug,
    messages: messages as ChatMessage[],
  });
  return newCode;
}

export async function getRetriedFunction(options: {
  code: string;
  testCommand: string[];
  failedReason: string;
  request: string;
  debug?: boolean;
}): Promise<string> {
  const coder = buildCoder();
  const test = undefined;
  const messages = coder.retryWith({
    code: options.code,
    test: test,
    request: options.request,
    testCommand: options.testCommand,
    failedReason: options.failedReason,
  });
  return await requestNewCode({
    model: selectModel({ vision: false }),
    vision: false,
    debug: options.debug,
    messages: messages as ChatMessage[],
  });
}

export async function getFixedFunction(options: {
  target: string;
  code: string;
  request: string;
  debug: boolean;
}): Promise<string> {
  const coder = buildCoder();
  const messages = coder.fix({
    code: options.code,
    request: options.request,
  });
  const model = selectModel({ vision: false });
  const newCode = await requestNewCode({
    model: model,
    vision: false,
    debug: options.debug,
    messages: messages as ChatMessage[],
  });
  return newCode;
}
