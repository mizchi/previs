import { readFile } from 'node:fs/promises';
import { $, extname } from '../deps.ts';
import { requestRefinedCode } from "./request.ts";
import { buildFirstPrompt, buildRetryPrompt, systemPrompt } from "./prompt.ts";

const MAX_RETRY = 3;

type FixerOptions = {
  target: string;
  useImageModel: boolean;
  screenshotPath: string;
  printRaw: boolean;
  action?: (code: string) => Promise<void>;
}

export function createFixer(options: FixerOptions) {
  return {
    fix,
    hookSigintSignal,
    cleanup,
  }

  async function fix(code: string, userPrompt: string, oldPrompt?: string) {
    const testFilepath = await getTestFileName(options.target);
    const testCode = testFilepath ? Deno.readTextFileSync(testFilepath) : undefined;
    const builtPrompt = buildFirstPrompt(code, userPrompt, testCode, oldPrompt);
    let outputCode = await requestRefinedCode({
      image: options.useImageModel,
      printRaw: options.printRaw,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: options.useImageModel ? [
            {
              type: "text",
              text: builtPrompt,
            },
            {
              type: "image",
              image_url: {
                url: `data:image/jpeg;base64,${await readFile(options.screenshotPath, 'base64')}`
              }
            }
          ] : builtPrompt,
        }
      ],
      "--": [],
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
        console.log("\n --- テストに失敗しました。修正して再生成します。---\n");
        const failMessage = testResult.stderr;
        outputCode = await requestRefinedCode({
          image: options.useImageModel,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: buildRetryPrompt(outputCode, userPrompt, testCode!, failMessage, oldPrompt),
            }
          ],
          "--": [],
        });
      }
      if (!passed) {
        await rollback();
        return;
      }
    }
    await options.action?.(outputCode);
    const response = prompt("Accept？ [y/N/Request]");
    if (response === "N") {
      await rollback();
      return;
    }
    if (response === "y" || response === "Y" || response === "yes" || response === "YES") {
      await cleanup();
      return;
    }
    // retry
    await fix(outputCode, response!, userPrompt);
  }

  function hookSigintSignal() {
    Deno.addSignalListener("SIGINT", async () => {
      console.log("[rollback by Ctrl+C]");
      await rollback();
      await cleanup();
      Deno.exit(0);
    });
  }
  async function updateWithBackup(newContent: string) {
    const oldContent = await Deno.readTextFile(options.target);
    const backupName = options.target + '.bk';
    await Deno.writeTextFile(backupName, oldContent);
    await Deno.writeTextFile(options.target, newContent);
  }

  async function rollback() {
    const backupName = options.target + '.bk';
    const oldContent = await Deno.readTextFile(backupName);
    await Deno.writeTextFile(options.target, oldContent);
    await cleanup();
  }

  async function cleanup() {
    const backupName = options.target + '.bk';
    if (!await exists(backupName)) return;
    await Deno.remove(backupName);
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


async function exists(path: string): Promise<boolean> {
  return await Deno.stat(path).then(() => true).catch(() => false);
}
