import { readFile } from 'node:fs/promises';
import { startBuilder } from "./builder/mod.ts";
import { join, $, exists } from "./deps.ts";
import { getFixedCode, getNewCode, getRetryCode } from "./fixer/mod.ts";
import { PrevisOptions } from "./options.ts";
import { startBrowser } from "./screenshot/mod.ts";
import { analyzeEnv, getTempFilepath } from "./utils.ts";

const defaultPort = "3434";

export async function init(_options: PrevisOptions) {
  throw new Error("Not implemented");
  // const virtualRoot = join(Deno.cwd(), ".previs");
  // await initializeProject({
  //   width: options.width ?? "fit-content",
  //   height: options.height ?? "fit-content",
  //   preExists: false,
  //   virtualRoot,
  //   viteBase: Deno.cwd(),
  //   style: options.style?.map(s => join(Deno.cwd(), s)) ?? []
  // });
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
  const tempTarget = getTempFilepath(target);
  await Deno.copyFile(target, tempTarget);

  const ssbr = await runScreenshotBrowser(options, tempTarget);
  await ssbr.screenshot();

  if (options.testCommand) {
    await test(options, tempTarget);
  }

  let request = await options.getInput("How to fix?");
  if (!request) {
    await ssbr.end();
    await Deno.remove(tempTarget);
    return;
  };
  let code = await Deno.readTextFile(tempTarget);
  let failedReason: string | undefined = undefined;

  if (!request) return;
  while (true) {
    const newCode = failedReason
      ? await getRetryCode({
        code,
        vision,
        request: request!,
        failedReason,
        testCommand: options.testCommand!,
        debug: options.debug,
        getImage: () => ssbr.getImage(),
      })
      : await getFixedCode({
        code,
        vision,
        request: request!,
        debug: options.debug,
        getImage: () => ssbr.getImage(),
      });
    if (options.testCommand) {
      const [cmd, ...args] = options.testCommand;
      const newArgs = args.map(s => s.replace('__FILE__', tempTarget));
      const testResult = await $`${cmd} ${newArgs}`.noThrow();
      if (testResult.code === 0) {
        console.log("[previs] test passed");
        failedReason = undefined;
      } else {
        // test failed
        console.log("[previs] test failed");
        failedReason = testResult.stderr;
        code = newCode;
        continue;
        // TODO: retry
      }
    }
    // save and screenshot
    await Deno.writeTextFile(tempTarget, newCode);
    await ssbr.screenshot();
    request = await options.getInput("Accept? [y/N/Prompt]");
    if (request === "y") {
      await Deno.rename(tempTarget, target);
      break;
    }
    if (request === "N") {
      await Deno.remove(tempTarget);
      break;
    }
    code = newCode;
  }
  await ssbr.end();
}

export async function test(options: PrevisOptions, target: string) {
  // const tempTarget = getTempFilepath(target);
  if (!options.testCommand) {
    throw new Error("testCommand is not set");
  }
  const [cmd, ...args] = options.testCommand;
  const newArgs = args.map(s => s.replace('__FILE__', target));

  // console.log(`[previs] Testing ${target} with ${cmd} ${newArgs.join(' ')}`);
  const testResult = await $`${cmd} ${newArgs}`.noThrow();
  if (testResult.code === 0) {
    console.log("[previs] test passed");
  } else {
    // test failed
    console.log("[previs] test failed");
  }
}

export async function generate(options: PrevisOptions, target: string) {
  await Deno.writeTextFile(target, 'export default function () {\n  return <div>Hello</div>\n}');
  const screenshot = await runScreenshotBrowser(options, target);
  const vision = !!options.vision;
  const printRaw = !!options.printRaw;

  const tempTarget = getTempFilepath(target);
  await screenshot.screenshot();
  // first time
  const request = await options.getInput("What is this component?");
  if (!request) return;
  const newCode = await getNewCode({
    target,
    request,
    printRaw,
    vision,
  });
  await screenshot.screenshot();
  await Deno.writeTextFile(tempTarget, newCode);
  await printCode(target);
  const accepted = await options.getConfirm("Accept？ [y/N]");
  if (accepted) {
    await Deno.rename(tempTarget, target);
    return;
  }
  if (!accepted) {
    await Deno.remove(tempTarget);
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
  const imports = options.import?.map(s => join(Deno.cwd(), s)) ?? []
  const port = Number(options.port || defaultPort);
  return await startBuilder({
    width: options.width ?? "fit-content",
    height: options.height ?? "fit-content",
    cwd: Deno.cwd(),
    target,
    imports,
    port,
  });
}

async function runScreenshotBrowser(options: PrevisOptions, target: string) {
  const builder = await runBuildServer(options, target);
  const tempTarget = getTempFilepath(target);
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
    async getImage() {
      return await readFile(screenshotPath, 'base64');
    },
    async end() {
      builder.end();
      await browser.close();
    },
    screenshot: async () => {
      await builder.ensureBuild();
      await browser.screenshot(screenshotUrl);
      if (await hasCmd("bat")) {
        if (await exists(target) && await exists(tempTarget)) {
          await $`git --no-pager diff --no-index --color=always ${tempTarget} ${target}`.noThrow();
        } else {
          await $`bat --language=tsx --style=grid --paging=never ${target}`;
        }
      } else {
        await $`cat ${target}`;
      }
    }
  }
}

export async function doctor(_options: PrevisOptions) {
  await checkInstalled('git', 'Please install git');
  await checkInstalled('code', 'Please install vscode cli');
  await checkInstalled('imgcat', 'Please install imgcat');
  await checkInstalled('bat', 'Please install bat');

  const apiKey = Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("PREVIS_OPENAI_API_KEY")
  if (apiKey) {
    console.log("✅ PREVIS_OPENAI_API_KEY is set");
  } else {
    console.log("❌ PREVIS_OPENAI_API_KEY is not set. Please set it in .env or environment variable");
  }

  const { viteDir, cwd, tsconfig, isReactJsx, libraryMode, packageJson, base, gitignore } = await analyzeEnv(Deno.cwd());
  if (viteDir) {
    console.log("✅ vite:", formatFilepath(viteDir.path));
  } else {
    console.log("❌ vite:", "Project is not setup for vite");
  }

  if (gitignore) {
    const content = await Deno.readTextFile(gitignore.path);
    if (content.includes(".previs*")) {
      console.log("✅ .gitignore includes .previs*");
    } else {
      console.log("❌ .gitignore:", "Add .previs* to .gitignore");
    }
  }

  if (packageJson) {
    console.log("✅ package.json:", formatFilepath(packageJson.path));
  } else {
    console.log("❌ package.json", "Put package.json in the root of the project");
  }

  // if (nodeModulesDir) {
  //   console.log("✅ node_modules:", formatFilepath(nodeModulesDir.found));
  // } else {
  //   console.log("❌ node_modules:", "Install node_modules");
  // }

  // if (vscodeDir) {
  //   console.log("✅ vscode settings:", formatFilepath(vscodeDir.found), '');
  // }

  if (tsconfig) {
    console.log("✅ tsconfig.json:", formatFilepath(tsconfig.path));
  }

  if (isReactJsx) {
    console.log("✅ compilerOptions.jsx: react-jsx");
  } else {
    console.log("❌ compilerOptions.jsx is not react-jsx");
  }

  if (libraryMode) {
    console.log("Library:", libraryMode);
  }

  console.log("Base:", formatFilepath(base));
  return;

  function formatFilepath(path: string) {
    if (path === cwd) {
      return './';
    }
    if (path.startsWith(cwd)) {
      const out = path.replace(cwd + '/', './');
      return out;
    } else {
      if (path.startsWith(Deno.env.get("HOME")!)) {
        return path.replace(Deno.env.get("HOME")!, '~');
      }
      return path;
    }
  }

  async function checkInstalled(command: string, failMessage: string) {
    if (await hasCmd(command)) {
      console.log(`✅ ${command}`);
      return true;
    } else {
      console.log(`❌ ${command}:`, failMessage);
      return false;
    }
  }
  // TODO: Check puppeteer
  // TODO: Check deno version
  // TODO: Check vite environment
  // TODO: Check node_modules
  // TODO: Check tailwindcss
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

