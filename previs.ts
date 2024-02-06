import { join, parseArgs, $, exists, type ParseArgsConfig } from "./deps.ts";
import { startBuilder, initializeProject } from "./builder/mod.ts";
import { startBrowser } from "./screenshot/mod.ts";
import { createFixer } from "./fixer/mod.ts";

const defaultPort = "3434"

// TODO: separte init and run options
const parseArgsOptions = {
  help: {
    type: "boolean",
    short: "h",
  },
  vision: {
    type: "boolean",
  },
  request: {
    type: "string",
    short: "r",
  },
  debug: {
    type: "boolean",
    short: "d",
  },
  scale: {
    type: "string",
  },
  width: {
    type: "string",
    short: "w",
  },
  height: {
    type: "string",
    short: "h",
  },
  queue: {
    type: "string",
    short: "q",
  },
  force: {
    type: "boolean",
    short: "f",
    default: false,
  },
  style: {
    type: 'string',
    short: 's',
    multiple: true,
  },
  printRaw: {
    type: 'boolean',
    short: 'r',
  },
  port: {
    type: "string",
    short: "p",
    default: defaultPort,
  },
} as const;

const previsCommandIntro = `usage:
$ previs [options] <target-file>

Examples:
  # fix existed file
  $ previs button.tsx

  # fix existed file with css (like tailwindcss)
  $ previs src/button.tsx --style src/image.css

  # generate new file
  $ previs src/button.tsx --input "This is button component"

These are common Previs commands used in various situations:

Doctor: checking environment
  $ previs doctor

Screenshot:
  $ previs ss [options] <target>

Serve:
  $ previs serve [options] <target>
`;

function printHelp(options: NonNullable<ParseArgsConfig['options']>) {
  let help = previsCommandIntro;
  const keys = Object.keys(options);
  for (const key of keys) {
    const option = options[key];
    const type = option.type;
    const short = option.short;
    const defaultValue = option.default;
    help += `-${short}, --${key} <${type}>${defaultValue ? ` (default: ${defaultValue})` : ""}\n`;
  }
  console.log(help);
}

const options = parseArgs({
  args: Deno.args,
  options: parseArgsOptions,
  allowPositionals: true,
});

const inputQueue = options.values.queue ? options.values.queue.split(",").map(s => s.trim()) : undefined;
const first = options.positionals[0];

if (options.values.help) {
  printHelp(parseArgsOptions);
  Deno.exit(0);
}

switch (first) {
  case "init": {
    const virtualRoot = join(Deno.cwd(), ".previs");
    await initializeProject({
      width: options.values.width ?? "fit-content",
      height: options.values.height ?? "fit-content",
      preExists: false,
      virtualRoot,
      viteBase: Deno.cwd(),
      style: options.values.style?.map(s => join(Deno.cwd(), s)) ?? []
    });
    break;
  }
  case "ss": {
    const second = options.positionals[1];
    if (!second) {
      console.error("Please specify target file");
      Deno.exit(1);
    }
    const target = join(Deno.cwd(), second);
    const ssbr = await runScreenshotBrowser(target);
    await ssbr.screenshot();
    if (await hasCmd("imgcat")) {
      await $`imgcat ${ssbr.getScreenshotPath()}`;
    }
    await ssbr.end();
    break;
  }

  case "fix": {
    const second = options.positionals[1];
    if (!second) {
      console.error("Please specify target file");
      Deno.exit(1);
    }
    const target = join(Deno.cwd(), second);
    const vision = !!options.values.vision;
    const printRaw = !!options.values.printRaw;

    const ssbr = await runScreenshotBrowser(target);
    await ssbr.screenshot();

    const disposeFixer = await runFixer({
      target,
      vision,
      printRaw,
      screenshotPath: ssbr.getScreenshotPath(),
      action: ssbr.screenshot
    });
    disposeFixer();
    await ssbr.end();
    break;
  }

  case "create": {
    const second = options.positionals[1];
    if (!second) {
      console.error("Please specify target file");
      Deno.exit(1);
    }
    const target = join(Deno.cwd(), second);
    await Deno.writeTextFile(target, 'export default function () {\n  return <div>Hello</div>\n}');
    const screenshot = await runScreenshotBrowser(target);
    const vision = !!options.values.vision;
    const printRaw = !!options.values.printRaw;

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
    if (!request) break;

    const newCode = await fixer.create(target, request);
    await Deno.writeTextFile(target, newCode);

    await printCode(target);
    const accepted = await getConfirm("Accept？ [y/N]");
    if (!accepted) {
      await Deno.remove(target);
      break;
    }
    if (accepted) {
      await Deno.writeTextFile(target, newCode);
    }
    await screenshot.end();
    break;
  }
  default: {
    const target = join(Deno.cwd(), first);
    const builder = await runBuildServer(target);
    Deno.addSignalListener("SIGINT", () => {
      builder.cleanup();
      Deno.exit(0);
    });
  }
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
    action: opts.action
  });
  fixer.hookSignal();

  // first time
  const request = await getInput("What do you want to fix?");
  if (request) {
    const content = await Deno.readTextFile(opts.target);
    await fixer.fix(content, request);
  }
  return () => {
    fixer.cleanup();
  }
}

// mock prompt for manual debug
async function getInput(message: string): Promise<string | undefined> {
  if (Array.isArray(inputQueue)) return inputQueue.shift();
  return await $.prompt(message);
}

async function getConfirm(message: string): Promise<boolean> {
  if (Array.isArray(inputQueue)) {
    const next = inputQueue.shift();
    return next === "y";
  }
  return await $.confirm(message);
}