import { readFile } from 'node:fs/promises';
import { $, extname } from '../deps.ts';
import { askStreamly } from "./ask.ts";
import { buildFirstPrompt, buildRetryPrompt, systemPrompt } from "./promptBuilder.ts";

const MAX_RETRY = 3;

export function createCodeFixer(
  targetFilepath: string,
  useImageModel: boolean,
  ssOutpath: string,
  action: (code: string) => Promise<void>,
) {
  return {
    fix,
    hookSigintSignal,
    cleanup,
  }

  async function fix(code: string, userPrompt: string, oldPrompt?: string) {
    const testFilepath = await getTestFileName(targetFilepath);
    const testCode = testFilepath ? Deno.readTextFileSync(testFilepath) : undefined;
    const builtPrompt = buildFirstPrompt(code, userPrompt, testCode, oldPrompt);
    let outputCode = await askStreamly({
      image: useImageModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: useImageModel ? [
            {
              type: "text",
              text: builtPrompt,
            },
            {
              type: "image",
              image_url: {
                url: `data:image/jpeg;base64,${await readFile(ssOutpath, 'base64')}`
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
        outputCode = await askStreamly({
          image: useImageModel,
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
    await action(outputCode);
    const response = prompt("この変更を採用しますか？ [y/N/追加条件]");
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
    const oldContent = await Deno.readTextFile(targetFilepath);
    const backupName = targetFilepath + '.bk';
    await Deno.writeTextFile(backupName, oldContent);
    await Deno.writeTextFile(targetFilepath, newContent);
  }

  async function rollback() {
    const backupName = targetFilepath + '.bk';
    const oldContent = await Deno.readTextFile(backupName);
    await Deno.writeTextFile(targetFilepath, oldContent);
    await cleanup();
  }

  async function cleanup() {
    const backupName = targetFilepath + '.bk';
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
