export { buildMarkupper } from './markupper.ts';

import { readFile } from 'node:fs/promises';
import { $, extname, exists } from '../deps.ts';
import { requestRefinedCode } from "./request.ts";
import { buildMarkupper } from "./markupper.ts";

const MAX_RETRY = 3;

type FixerOptions = {
  target: string;
  useImageModel: boolean;
  screenshotPath: string;
  printRaw: boolean;
  action?: (code: string) => Promise<void>;
}

export function createFixer(options: FixerOptions) {
  const markupper = buildMarkupper();
  const backupName = options.target + '.bk';
  return {
    create,
    fix,
    hookSignal,
    cleanup,
  }

  async function create(filename: string, request: string) {
    const messages = markupper.create({
      filename, request,
    });
    const newCode = await requestRefinedCode({
      image: options.useImageModel,
      printRaw: options.printRaw,
      messages: messages as any,
    });
    return newCode;
  }

  async function fix(code: string, request: string, oldPrompt?: string) {
    const testFilepath = await getTestFileName(options.target);
    const test = testFilepath ? Deno.readTextFileSync(testFilepath) : undefined;
    const messages = markupper.fix({
      code,
      test: test,
      request: request,
      oldPrompt,
      imageUrl: options.useImageModel ? `data:image/jpeg;base64,${await readFile(options.screenshotPath, 'base64')}` : undefined,
    });
    let outputCode = await requestRefinedCode({
      image: options.useImageModel,
      printRaw: options.printRaw,
      messages: messages as any,
    });
    await updateWithBackup(outputCode);
    // run test if exists
    if (testFilepath) {
      let retryCounter = 0;
      let passed = false;
      while (retryCounter++ < MAX_RETRY) {
        const testResult = await $`deno test -A --no-check ${testFilepath}`;
        if (testResult.code === 0) {
          passed = true;
          break;
        }
        // failded
        console.log("\n --- Test faild. Retry Again---\n");
        const failMessage = testResult.stderr;
        const messages = markupper.retryWith({
          code: outputCode,
          request: request,
          failReason: failMessage,
          test: test!,
          lastPrompt: request,
        });
        outputCode = await requestRefinedCode({
          image: options.useImageModel,
          messages: messages as any,
        });
      }
      if (!passed) {
        await rollback();
        return;
      }
    }
    await options.action?.(outputCode);
    const response = await $.prompt("Accept？ [y/N/Request]");
    if (response === "N") {
      console.log("[rollback]");
      await rollback();
      return;
    }
    if (response === "y" || response === "Y" || response === "yes" || response === "YES") {
      await cleanup();
      return;
    }
    // retry
    await fix(outputCode, response!, request);
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

async function getTestFileName(target: string): Promise<string | void> {
  const ext = extname(target);
  const testFile = target.replace(ext, `.test${ext}`);
  if (await exists(testFile)) {
    return testFile;
  }
  return undefined;
}
