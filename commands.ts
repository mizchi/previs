import { readFile } from 'node:fs/promises';
import { startBuilder } from "./builder/mod.ts";
import { join, $ } from "./deps.ts";
import { getFixedComponent, getNewComponent, getNewFunction, getRetriedComponent, getRetriedFunction } from "./fixer/mod.ts";
import { PrevisOptions } from "./options.ts";
import { startBrowser } from "./screenshot/mod.ts";
import { analyzeEnv, detectLibraryFromTargetPath, getTempFilepath, pxToNumber } from "./utils.ts";

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
    const width = options.width ? pxToNumber(options.width) : 400;
    await $`imgcat -W ${width}px ${ssbr.getScreenshotPath()}`;
  }
  await ssbr.end();
}

export async function fix(options: PrevisOptions, target: string) {
  const uiMode = !target.endsWith(".ts");
  const vision = !!options.vision && uiMode;
  const tempTarget = getTempFilepath(target);
  const tailwind = options.env.useTailwind;
  const library = await detectLibraryFromTargetPath(target) ?? options.env.libraryMode;
  const auto = options.auto;

  console.log("[previs:detect]", {
    tailwind,
    library,
  });

  if (auto && !options.testCommand) {
    throw new Error("testCommand is required for auto mode");
  }
  await Deno.copyFile(target, tempTarget);

  let runner: Awaited<ReturnType<typeof runScreenshotBrowser>> | undefined = undefined;

  if (uiMode) {
    runner = await runScreenshotBrowser(options, target);
    await runner.screenshot();
  }

  let code = await Deno.readTextFile(tempTarget);
  let failedReason: string | undefined = undefined;

  if (options.testCommand) {
    const result = await runTest({ testCommand: options.testCommand, target: tempTarget });
    if (result.code === 0) {
      // test passed
    } else {
      failedReason = result.stderr;
    }
  }

  let request = options.request ?? auto ? "Pass tests" : await options.getInput("Request>");
  if (!request) {
    await runner?.end();
    await Deno.remove(tempTarget);
    return;
  };
  // let code = await Deno.readTextFile(tempTarget);
  // let failedReason: string | undefined = undefined;

  if (!request) return;
  while (true) {
    let newCode: string;
    if (uiMode) {
      newCode = failedReason
        ? await getRetriedComponent({
          code,
          vision,
          library,
          tailwind,
          request: request!,
          failedReason,
          model: options.model,
          testCommand: options.testCommand!,
          debug: options.debug,
          getImage: (() => runner!.getImage()),
        })
        : await getFixedComponent({
          code,
          vision,
          library,
          tailwind,
          request: request!,
          model: options.model,
          debug: options.debug,
          getImage: () => runner!.getImage(),
        });
    } else {
      newCode = failedReason
        ? await getRetriedFunction({
          code,
          model: options.model,
          testCommand: options.testCommand!,
          request: request!,
          debug: !!options.debug,
          failedReason,
        })
        : await getNewFunction({
          target,
          model: options.model,
          request: request!,
          debug: !!options.debug,
        });
    }
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
    await runner?.screenshot();

    // pass 
    if (auto) {
      await Deno.rename(tempTarget, target);
      break;
    }

    request = await options.getInput("Accept? [y/N/<request>]");
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
  await runner?.end();
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
  const uiMode = !target.endsWith(".ts");

  if (uiMode) {
    await Deno.writeTextFile(target, 'export default function () {\n  return <div>Hello</div>\n}');
    const runner = await runScreenshotBrowser(options, target);
    const vision = !!options.vision;
    const tailwind = options.env.useTailwind;
    const library = await detectLibraryFromTargetPath(target) ?? options.env.libraryMode;

    console.log("[previs:detect]", {
      tailwind,
      library,
    });

    const tempTarget = getTempFilepath(target);
    await runner.screenshot();
    // first time
    const request = options.request ?? await options.getInput("What is this file?");
    if (!request) return;
    const newCode = await getNewComponent({
      target,
      request,
      tailwind,
      library: library,
      debug: options.debug,
      model: options.model,
      vision,
    });
    await runner.screenshot();
    await Deno.writeTextFile(tempTarget, newCode);
    await printCode(tempTarget);
    const accepted = options.yes ?? await options.getConfirm("Accept?");
    if (accepted) {
      await Deno.rename(tempTarget, target);
    } else {
      await Deno.remove(tempTarget);
    }
    await runner.end();
  } else {
    // non-ui mode
    await Deno.writeTextFile(target, 'export default function () {}');

    const tempTarget = getTempFilepath(target);
    // first time
    const request = options.request ?? await options.getInput("What is this file?");
    if (!request) return;
    const newCode = await getNewFunction({
      model: options.model,
      target,
      request,
      debug: !!options.debug,
    });
    await Deno.writeTextFile(tempTarget, newCode);
    await printCode(tempTarget);
    const accepted = options.yes ?? await options.getConfirm("Accept?");
    if (accepted) {
      await Deno.rename(tempTarget, target);
    } else {
      await Deno.remove(tempTarget);
    }
  }
}

export async function serve(options: PrevisOptions, target: string) {
  const builder = await runBuildServer(options, target);
  options.addHook(() => builder.end());
}

async function runBuildServer(options: PrevisOptions, target: string) {
  const imports = options.import?.map(s => join(Deno.cwd(), s)) ?? []
  const port = Number(options.port || defaultPort);
  return await startBuilder({
    cwd: Deno.cwd(),
    target,
    imports,
    port,
  });
}

async function runScreenshotBrowser(options: PrevisOptions, target: string) {
  const tempTarget = getTempFilepath(target);
  const builder = await runBuildServer(options, tempTarget);
  options.addHook(() => builder.end());
  const scale = options.scale ?? typeof options.scale === "string" ? Number(options.scale) : undefined;
  const tmpdir = Deno.makeTempDirSync();
  const screenshotPath = join(tmpdir, "ss.png");
  const port = Number(options.port || defaultPort);
  const screenshotUrl = `http://localhost:${port}/`;
  await builder.ensureBuild();
  const onScreenshot = async () => {
    if (await hasCmd("imgcat")) {
      const width = options.width ? pxToNumber(options.width) : 400;
      await $`imgcat -W ${width}px ${screenshotPath}`;
    }
  };
  const browser = await startBrowser({
    width: options.width,
    height: options.height,
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
      if (!options.noDiff) {
        await $`git --no-pager diff --no-index --color=always ${target} ${tempTarget}`.noThrow();
      }
    }
  }
}

export async function doctor(_options: PrevisOptions) {
  await checkInstalled('git', 'Please install git');
  await checkInstalled('code', 'Please install vscode cli. https://code.visualstudio.com/docs/editor/command-line');
  await checkInstalled('imgcat', 'Please install imgcat.\nDownload https://iterm2.com/utilities/imgcat and chmod +x in PATH');
  await checkInstalled('bat', 'Please install bat. https://github.com/sharkdp/bat');

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


async function runTest(options: { testCommand: string[], target: string }) {
  const [cmd, ...args] = options.testCommand;
  const newArgs = args.map(s => s.replace('__FILE__', options.target));
  const testResult = await $`${cmd} ${newArgs}`.noThrow();
  return testResult;
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

