import { join, $, exists } from "./deps.ts";
import { startBuilder, initializeProject } from "./builder/mod.ts";
import { startBrowser } from "./screenshot/mod.ts";
import { createFixer } from "./fixer/mod.ts";
import { help, getParsedArgs, PrevisOptions } from "./options.ts"

const defaultPort = "3434"
const options = getParsedArgs(Deno.args);

// ==== process helper ====
const __disposes: Array<() => void | Promise<void>> = [];
function addHook(disposeFn: () => void | Promise<void>) {
  if (__disposes.length === 0) {
    // hook once
    Deno.addSignalListener("SIGINT", async () => {
      for (const disposeFn of __disposes) {
        try {
          await disposeFn();
        } catch (err) {
          console.error('[previs:hooks:error]', err);
        }
      }
      Deno.exit(1);
    });
  }
  __disposes.push(disposeFn);
}

async function exit(status: number) {
  if (__disposes.length === 0) Deno.exit(status);
  for (const disposeFn of __disposes) {
    try {
      await disposeFn();
    } catch (err) {
      console.error('[previs:hooks:error]', err);
    }
  }
  Deno.exit(status);
}

const __queue = options.values.queue ? options.values.queue.split(",").map(s => s.trim()) : undefined;
async function getInput(message: string): Promise<string | undefined> {
  if (Array.isArray(__queue)) return __queue.shift();
  return await $.prompt(message);
}
async function getConfirm(message: string): Promise<boolean> {
  if (Array.isArray(__queue)) {
    const next = __queue.shift();
    return next === "y";
  }
  return await $.confirm(message);
}

// ==== commands ====

async function init(options: PrevisOptions) {
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

async function screenshot(_options: PrevisOptions, target: string) {
  const ssbr = await runScreenshotBrowser(target);
  await ssbr.screenshot();
  if (await hasCmd("imgcat")) {
    await $`imgcat ${ssbr.getScreenshotPath()}`;
  }
  await ssbr.end();
}

async function fix(options: PrevisOptions, target: string) {
  const vision = !!options.vision;
  const printRaw = !!options.printRaw;
  const ssbr = await runScreenshotBrowser(target);
  await ssbr.screenshot();
  await runFixer({
    target,
    vision,
    printRaw,
    screenshotPath: ssbr.getScreenshotPath(),
    action: ssbr.screenshot
  });
  await ssbr.end();
}

async function create(options: PrevisOptions, target: string) {
  await Deno.writeTextFile(target, 'export default function () {\n  return <div>Hello</div>\n}');
  const screenshot = await runScreenshotBrowser(target);
  const vision = !!options.vision;
  const printRaw = !!options.printRaw;

  const fixer = createFixer({
    target,
    vision,
    screenshotPath: screenshot.getScreenshotPath(),
    printRaw,
    action: screenshot.screenshot
  });
  fixer.hookSignal();

  // first time
  const request = await getInput("What is this component?");
  if (!request) return;

  const newCode = await fixer.create(target, request);
  await Deno.writeTextFile(target, newCode);

  await printCode(target);
  const accepted = await getConfirm("Accept？ [y/N]");
  if (!accepted) {
    await Deno.remove(target);
    return;
  }
  if (accepted) {
    await Deno.writeTextFile(target, newCode);
  }
  await screenshot.end();
}

async function serve(options: PrevisOptions, target: string) {
  const builder = await runBuildServer(target);
  Deno.addSignalListener("SIGINT", () => {
    builder.cleanup();
    Deno.exit(0);
  });
}

// run!

if (options.values.help) {
  help();
  Deno.exit(0);
}

try {
  const first = options.positionals[0];
  switch (first) {
    case "doctor": {
      // TODO: check environment
      break;
    }
    case "init": {
      await init(options.values);
      break;
    }
    case 'screenshot':
    case "ss": {
      const second = options.positionals[1];
      if (!second) throw new Error("Please specify target file");
      const target = join(Deno.cwd(), second);
      await screenshot(options.values, target);
      break;
    }
    case "fix": {
      const second = options.positionals[1];
      if (!second) throw new Error("Please specify target file");
      const target = join(Deno.cwd(), second);
      await fix(options.values, target);
      break;
    }
    case "create": {
      const second = options.positionals[1];
      if (!second) throw new Error("Please specify target file");
      const target = join(Deno.cwd(), second);
      await create(options.values, target);
      break;
    }
    case "serve": {
      const second = options.positionals[1];
      if (!second) throw new Error("Please specify target file");
      const target = join(Deno.cwd(), second);
      await serve(options.values, target);
      break;
    }
    default: {
      const target = join(Deno.cwd(), first);
      if (await exists(target)) {
        // run fix if exists
        console.log("[previs:fix]");
        await fix(options.values, target);
      } else {
        // run create if file not exists
        console.log("[previs:create]");
        await create(options.values, target);
      }
    }
  }
} catch (err) {
  console.error(err);
  await exit(1);
} finally {
  // cleanup
  await exit(0);
}

async function runBuildServer(target: string) {
  const style = options.values.style?.map(s => join(Deno.cwd(), s)) ?? []
  const port = Number(options.values.port || defaultPort);
  return await startBuilder({
    width: options.values.width ?? "fit-content",
    height: options.values.height ?? "fit-content",
    cwd: Deno.cwd(),
    target,
    style,
    port,
  });
}

async function runScreenshotBrowser(target: string) {
  const builder = await runBuildServer(target);
  const scale = options.values.scale ?? typeof options.values.scale === "string" ? Number(options.values.scale) : undefined;
  const tmpdir = Deno.makeTempDirSync();
  const screenshotPath = join(tmpdir, "ss.png");
  const port = Number(options.values.port || defaultPort);
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
    debug: options.values.debug
  });
  return {
    getScreenshotPath: () => screenshotPath,
    async end() {
      builder.cleanup();
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
  action: () => Promise<void>,
}) {
  const fixer = createFixer({
    target: opts.target,
    vision: opts.vision,
    screenshotPath: opts.screenshotPath,
    printRaw: opts.printRaw,
    // action: opts.action
  });
  fixer.hookSignal();
  while (true) {
    const request = await getInput("What do you want to fix?");
    if (!request) return;
    const content = await Deno.readTextFile(opts.target);
    const result = await fixer.fix(content, request);
    if (result.ok) {
      await opts.action?.();
      const response = await $.prompt("Accept？ [y/N/Request]");
      if (response === "N") {
        console.log("[rollback]");
        await fixer.rollback();
        break;
      }
      if (response === "y" || response === "Y" || response === "yes" || response === "YES") {
        await fixer.cleanup();
      }
    }
  }
}

