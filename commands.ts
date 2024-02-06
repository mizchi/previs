import { initializeProject, startBuilder } from "./builder/mod.ts";
import { join, $, exists } from "./deps.ts";
import { createFixer } from "./fixer/mod.ts";
import { PrevisOptions } from "./options.ts";
import { startBrowser } from "./screenshot/mod.ts";

const defaultPort = "3434";

export async function init(options: PrevisOptions) {
  const virtualRoot = join(Deno.cwd(), ".previs");
  await initializeProject({
    width: options.width ?? "fit-content",
    height: options.height ?? "fit-content",
    preExists: false,
    virtualRoot,
    viteBase: Deno.cwd(),
    style: options.style?.map(s => join(Deno.cwd(), s)) ?? []
  });
}

export async function screenshot(options: PrevisOptions, target: string) {
  const ssbr = await runScreenshotBrowser(options, target);
  await ssbr.screenshot();
  if (await hasCmd("imgcat")) {
    await $`imgcat ${ssbr.getScreenshotPath()}`;
  }
  await ssbr.end();
}

export async function fix(options: PrevisOptions, target: string) {
  const vision = !!options.vision;
  const printRaw = !!options.printRaw;
  const ssbr = await runScreenshotBrowser(options, target);
  await ssbr.screenshot();
  await runFixer({
    target,
    vision,
    printRaw,
    getInput: options.getInput,
    screenshotPath: ssbr.getScreenshotPath(),
    post: ssbr.screenshot
  });
  await ssbr.end();
}

export async function create(options: PrevisOptions, target: string) {
  await Deno.writeTextFile(target, 'export default function () {\n  return <div>Hello</div>\n}');
  const screenshot = await runScreenshotBrowser(options, target);
  const vision = !!options.vision;
  const printRaw = !!options.printRaw;

  const fixer = createFixer({
    target,
    vision,
    screenshotPath: screenshot.getScreenshotPath(),
    printRaw,
  });
  await screenshot.screenshot();

  // first time
  const request = await options.getInput("What is this component?");
  if (!request) return;

  const newCode = await fixer.create(target, request);
  await Deno.writeTextFile(target, newCode);

  await printCode(target);
  const accepted = await options.getConfirm("Accept？ [y/N]");
  if (!accepted) {
    await Deno.remove(target);
    return;
  }
  if (accepted) {
    await Deno.writeTextFile(target, newCode);
  }
  await screenshot.end();
}

export async function serve(options: PrevisOptions, target: string) {
  const builder = await runBuildServer(options, target);
  Deno.addSignalListener("SIGINT", () => {
    builder.end();
    Deno.exit(0);
  });
}

async function runBuildServer(options: PrevisOptions, target: string) {
  const style = options.style?.map(s => join(Deno.cwd(), s)) ?? []
  const port = Number(options.port || defaultPort);
  return await startBuilder({
    width: options.width ?? "fit-content",
    height: options.height ?? "fit-content",
    cwd: Deno.cwd(),
    target,
    style,
    port,
  });
}

async function runScreenshotBrowser(options: PrevisOptions, target: string) {
  const builder = await runBuildServer(options, target);
  options.addHook(() => builder.end());
  const scale = options.scale ?? typeof options.scale === "string" ? Number(options.scale) : undefined;
  const tmpdir = Deno.makeTempDirSync();
  const screenshotPath = join(tmpdir, "ss.png");
  const port = Number(options.port || defaultPort);
  const screenshotUrl = `http://localhost:${port}/`;
  await builder.ensureBuild();
  const onScreenshot = async () => {
    if (await hasCmd("imgcat")) {
      await $`imgcat ${screenshotPath}`;
    }
  };
  const browser = await startBrowser({
    screenshotPath,
    onScreenshot,
    scale,
    debug: options.debug
  });
  options.addHook(async () => await browser.close());
  return {
    getScreenshotPath: () => screenshotPath,
    async end() {
      builder.end();
      await browser.close();
    },
    screenshot: async () => {
      await builder.ensureBuild();
      await browser.screenshot(screenshotUrl);
      if (await hasCmd("bat")) {
        const backupOriginalPath = `${target}.bk'`;
        if (await exists(backupOriginalPath)) {
          await $`git --no-pager diff --no-index --color=always ${target} ${backupOriginalPath}`.noThrow();
        } else {
          await $`bat --language=tsx --style=grid --paging=never ${target}`;
        }
      } else {
        await $`cat ${target}`;
      }
    }
  }
}

async function hasCmd(command: string) {
  const ret = await $`which ${command}`.noThrow().quiet();
  return ret.code === 0;
}

async function printCode(target: string) {
  if (await hasCmd("bat")) {
    await $`bat --language=tsx --style=grid --paging=never ${target}`;
  } else {
    await $`cat ${target}`;
  }
}

async function runFixer(opts: {
  target: string,
  vision: boolean,
  printRaw: boolean,
  screenshotPath: string,
  getInput: (message: string) => Promise<string | undefined>,
  post: () => Promise<void>,
}) {
  const fixer = createFixer({
    target: opts.target,
    vision: opts.vision,
    screenshotPath: opts.screenshotPath,
    printRaw: opts.printRaw,
  });
  fixer.hookSignal();
  let prompt = await opts.getInput("How to fix?");
  if (!prompt) return;
  while (true) {
    const content = await Deno.readTextFile(opts.target);
    const result = await fixer.fix(content, prompt!);
    if (result.ok) {
      await opts.post?.();
      prompt = await opts.getInput("Accept? [y/N/Prompt]");
      if (prompt === "y") {
        await fixer.cleanup();
        break;
      }
      if (prompt === "N") {
        console.log("[rollback]");
        await fixer.rollback();
        break;
      }
      // run next
    }
  }
}

