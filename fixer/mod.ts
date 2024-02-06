import { ChatMessage } from './types.ts';
export { buildMarkupper } from './markupper.ts';

import { readFile } from 'node:fs/promises';
import { $, extname, exists } from '../deps.ts';
import { requestNewCode, selectModel } from "./request.ts";
import { buildMarkupper } from "./markupper.ts";

const MAX_RETRY = 3;

type FixerOptions = {
  target: string;
  vision: boolean;
  screenshotPath: string;
  printRaw: boolean;
  // action?: (code: string) => Promise<void>;
}

export function createFixer(options: FixerOptions) {
  const markupper = buildMarkupper();
  const backupName = `${options.target}.bk`;
  return {
    create,
    fix,
    rollback,
    hookSignal,
    cleanup,
  }

  async function create(filename: string, request: string) {
    const messages = markupper.create({
      filename, request,
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

  async function fix(code: string, request: string, oldPrompt?: string): Promise<{
    ok: true,
    code: string,
  } | {
    ok: false,
    reason: string,
  }> {
    const testFilepath = await getTestFileName(options.target);
    const test = testFilepath ? Deno.readTextFileSync(testFilepath) : undefined;
    const b64image = options.vision ? await readFile(options.screenshotPath, 'base64') : undefined;
    const messages = markupper.fix({
      code,
      test: test,
      request: request,
      oldPrompt,
      imageUrl: options.vision
        ? b64image
        : undefined,
    });
    let outputCode = await requestNewCode({
      model: selectModel({ vision: options.vision }),
      vision: options.vision,
      printRaw: options.printRaw,
      messages: messages as ChatMessage[],
    });
    await updateWithBackup(outputCode);
    // run test if exists
    if (testFilepath) {
      let retryCounter = 0;
      let passed = false;
      let failedMessage = '';
      while (retryCounter++ < MAX_RETRY) {
        const testResult = await $`deno test -A --no-check ${testFilepath}`;
        if (testResult.code === 0) {
          passed = true;
          break;
        }
        // failded
        console.log("\n --- Test faild. Retry Again---\n");
        failedMessage = testResult.stderr;
        const messages = markupper.retryWith({
          code: outputCode,
          request: request,
          failReason: failedMessage,
          test: test,
          lastPrompt: request,
        });
        outputCode = await requestNewCode({
          vision: options.vision,
          messages: messages as ChatMessage[],
        });
      }
      if (!passed) {
        await rollback();
        return {
          ok: false,
          reason: failedMessage,
        };
      }
    }
    return {
      ok: true,
      code: outputCode,
    }
  }

  function hookSignal() {
    const fn = async () => {
      console.log("[rollback by Ctrl+C]");
      await rollback();
      await cleanup();
      Deno.exit(0);
    };
    Deno.addSignalListener("SIGINT", fn);
    return () => Deno.removeSignalListener("SIGINT", fn);
  }
  async function updateWithBackup(newContent: string) {
    const oldContent = await Deno.readTextFile(options.target);
    await Deno.writeTextFile(backupName, oldContent);
    await Deno.writeTextFile(options.target, newContent);
  }

  async function rollback() {
    const oldContent = await Deno.readTextFile(backupName);
    await Deno.writeTextFile(options.target, oldContent);
    await cleanup();
  }

  async function cleanup() {
    if (await exists(backupName)) {
      await Deno.remove(backupName);
    }
  }
}

async function getTestFileName(target: string): Promise<string | undefined> {
  const ext = extname(target);
  const testFile = target.replace(ext, `.test${ext}`);
  if (await exists(testFile)) {
    return testFile;
  }
  return undefined;
}
