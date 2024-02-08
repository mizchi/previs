import { readFile } from 'node:fs/promises';
import { startBuilder } from "./builder/mod.ts";
import { join, $ } from "./deps.ts";
import { getFixedComponent, getFixedCode, getNewComponent, getNewCode, FixOptions } from "./fixer/mod.ts";
import { PrevisOptions } from "./options.ts";
import { startBrowser } from "./screenshot/mod.ts";
import { analyzeEnv, detectLibraryFromTargetPath, formatFilepath, getTempFilepath, pxToNumber } from "./utils.ts";

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
  await using ui = await runUI(options, target);
  await ui.screenshot();
  if (await hasCmd("imgcat")) {
    const width = options.width ? pxToNumber(options.width) : 400;
    await $`imgcat -W ${width}px ${ui.getScreenshotPath()}`;
  }
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

  await using ui = uiMode ? await runUI(options, target) : null;
  await ui?.screenshot();

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
    await Deno.remove(tempTarget);
    return;
  };

  if (!request) return;
  while (true) {
    const fixOptions: FixOptions = {
      code,
      target,
      model: options.model,
      request: request!,
      debug: !!options.debug,
      failedReason,
    };
    const newCode = uiMode
      ? await getFixedComponent({
        ...fixOptions,
        vision,
        library,
        tailwind,
        getImage: () => ui!.getBase64Image(),
      })
      : await getFixedCode(fixOptions);
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
    await ui?.screenshot();

    // pass 
    if (auto) {
      await Deno.rename(tempTarget, target);
      break;
    }

    request = options.getInput("Accept? [y/N/<request>]");
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
}

export async function test(options: PrevisOptions, target: string) {
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
    await using runner = await runUI(options, target);
    const vision = !!options.vision;
    const tailwind = options.env.useTailwind;
    const library = await detectLibraryFromTargetPath(target) ?? options.env.libraryMode;

    console.log("[previs:detect]", {
      tailwind,
      library,
    });

    const tempTarget = getTempFilepath(target);
    const request = options.request ?? options.getInput("What is this file?");
    if (!request) return;
    const newCode = await getNewComponent({
      target,
      request,
      tailwind,
      library: library,
      debug: options.debug,
      model: options.model,
      vision,
      getImage: () => runner.getBase64Image(),
    });

    await Deno.writeTextFile(tempTarget, newCode);
    if (!options.noPrint) {
      await printCode(tempTarget);
    }
    await runner.screenshot();
    const accepted = options.yes ?? options.getConfirm("Accept?");
    if (accepted) {
      await Deno.rename(tempTarget, target);
    } else {
      await Deno.remove(tempTarget);
    }
  } else {
    // non-ui mode
    await Deno.writeTextFile(target, 'export default function () {}');

    const tempTarget = getTempFilepath(target);
    // first time
    const request = options.request ?? options.getInput("What is this file?");
    if (!request) return;
    const newCode = await getNewCode({
      model: options.model,
      target,
      request,
      debug: !!options.debug,
    });
    await Deno.writeTextFile(tempTarget, newCode);
    if (!options.noPrint) {
      await printCode(tempTarget);
    }
    const accepted = options.yes ?? options.getConfirm("Accept?");
    if (accepted) {
      await Deno.rename(tempTarget, target);
    } else {
      await Deno.remove(tempTarget);
    }
  }
}

export async function serve(options: PrevisOptions, target: string) {
  const imports = options.import?.map(s => join(Deno.cwd(), s)) ?? []
  const port = Number(options.port || defaultPort);

  return await startBuilder({
    cwd: Deno.cwd(),
    target,
    imports,
    port,
  });
}

async function runUI(options: PrevisOptions, target: string) {
  const tempTarget = getTempFilepath(target);
  const imports = options.import?.map(s => join(Deno.cwd(), s)) ?? []

  const builder = await startBuilder({
    cwd: Deno.cwd(),
    target: tempTarget,
    imports,
    port: Number(options.port || defaultPort),
  });
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
  return {
    getScreenshotPath: () => screenshotPath,
    async getBase64Image() {
      return await readFile(screenshotPath, 'base64');
    },
    screenshot: async () => {
      await builder.ensureBuild();
      await browser.screenshot(screenshotUrl);
      if (!options.noPrint) {
        await $`git --no-pager diff --no-index --color=always ${target} ${tempTarget}`.noThrow();
      }
    },
    async [Symbol.asyncDispose]() {
      builder.dispose();
      await browser.dispose();
    },
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
    console.log("✅ vite:", formatFilepath(cwd, viteDir.path));
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
    console.log("✅ package.json:", formatFilepath(cwd, packageJson.path));
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
    console.log("✅ tsconfig.json:", formatFilepath(cwd, tsconfig.path));
  }

  if (isReactJsx) {
    console.log("✅ compilerOptions.jsx: react-jsx");
  } else {
    console.log("❌ compilerOptions.jsx is not react-jsx");
  }

  if (libraryMode) {
    console.log("Library:", libraryMode);
  }

  console.log("Base:", formatFilepath(cwd, base));
  return;


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

function getViewContext(options: PrevisOptions, target: string) {
  return {
    uiMode: !target.endsWith(".ts"),
    tailwind: options.env.useTailwind,
    library: options.env.libraryMode,
  };
}

