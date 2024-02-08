import { readFile } from 'node:fs/promises';
import { startBuilder } from "../builder/mod.ts";
import { join, $ } from "../deps.ts";
import { getFixedComponent, getFixedCode, getNewComponent, getNewCode, FixOptions } from "../fixer/mod.ts";
import { CLIOptions, getHelpText } from "./options.ts";
import { startBrowser } from "../screenshot/mod.ts";
import { formatFilepath, getTempFilepath, pxToNumber } from "../utils.ts";
import { ProjectContext, getProjectContext, getTargetContext } from "./context.ts";

const defaultPort = "3434";

// deno-lint-ignore require-await
export async function init(_options: CLIOptions, _ctx: ProjectContext) {
  throw new Error("Not implemented");
}

export async function screenshot(options: CLIOptions, _ctx: ProjectContext) {
  await using ui = await runUI(options);
  await ui.screenshot();
  if (await hasCmd("imgcat")) {
    const width = options.width ? pxToNumber(options.width) : 400;
    await $`imgcat -W ${width}px ${ui.getScreenshotPath()}`;
  }
}

export async function fix(options: CLIOptions, ctx: ProjectContext) {
  const target = options.target!;
  const uiMode = !target.endsWith(".ts");
  const vision = !!options.vision && uiMode;
  const tempTarget = getTempFilepath(target);
  const tailwind = ctx.useTailwind;
  const library = await getTargetContext(target) ?? ctx.libraryMode;
  const auto = options.auto;

  console.log("[previs:detect]", {
    tailwind,
    library,
  });

  if (auto && !options.testCmd) {
    throw new Error("testCmd is required for auto mode");
  }
  await Deno.copyFile(target, tempTarget);

  await using ui = uiMode ? await runUI(options) : null;
  await ui?.screenshot();

  let code = await Deno.readTextFile(tempTarget);
  let errorText: string | undefined = undefined;

  if (options.testCmd) {
    const result = await runTest({ testCmd: options.testCmd, target: tempTarget });
    if (result.code === 0) {
      // test passed
    } else {
      errorText = result.stderr;
    }
  }

  let request = options.request ?? auto ? "Pass tests" : ctx.getInput("fix>");
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
      errorText,
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
    if (options.testCmd) {
      const [cmd, ...args] = options.testCmd;
      const newArgs = args.map(s => s.replace('__FILE__', tempTarget));
      const testResult = await $`${cmd} ${newArgs}`.noThrow();
      if (testResult.code === 0) {
        console.log("[previs] test passed");
        errorText = undefined;
      } else {
        // test failed
        console.log("[previs] test failed");
        errorText = testResult.stderr;
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

    request = ctx.getInput("Accept? [y/N/<request>]");
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

export async function test(options: CLIOptions, _ctx: ProjectContext) {
  if (!options.testCmd) {
    throw new Error("testCmd is not set");
  }
  const [cmd, ...args] = options.testCmd;
  const newArgs = args.map(s => s.replace('__FILE__', options.target!));

  // console.log(`[previs] Testing ${target} with ${cmd} ${newArgs.join(' ')}`);
  const testResult = await $`${cmd} ${newArgs}`.noThrow();
  if (testResult.code === 0) {
    console.log("[previs] test passed");
  } else {
    // test failed
    console.log("[previs] test failed");
  }
}

export async function generate(options: CLIOptions, ctx: ProjectContext) {
  const target = options.target!;
  const uiMode = !target.endsWith(".ts");

  if (uiMode) {
    await Deno.writeTextFile(target, 'export default function () {\n  return <div>Hello</div>\n}');
    await using runner = await runUI(options);
    const vision = !!options.vision;
    const tailwind = ctx.useTailwind;
    const library = await getTargetContext(target) ?? ctx.libraryMode;

    console.log("[previs:detect]", {
      tailwind,
      library,
    });

    const tempTarget = getTempFilepath(target);
    const request = options.request ?? ctx.getInput("What is this file?");
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
    const accepted = options.yes ?? ctx.getConfirm("Accept?");
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
    const request = options.request ?? ctx.getInput("What is this file?");
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
    const accepted = options.yes ?? ctx.getConfirm("Accept?");
    if (accepted) {
      await Deno.rename(tempTarget, target);
    } else {
      await Deno.remove(tempTarget);
    }
  }
}

export async function serve(options: CLIOptions, _ctx: ProjectContext) {
  const target = options.target!;
  const imports = options.import?.map(s => join(Deno.cwd(), s)) ?? []
  const port = Number(options.port || defaultPort);

  await startBuilder({
    cwd: _ctx.base,
    target,
    imports,
    port,
  });
}

export async function help(_options: CLIOptions, _ctx: ProjectContext) {
  const helpText = getHelpText();
  console.log(helpText);
}

async function runUI(options: CLIOptions) {
  const tempTarget = getTempFilepath(options.target!);
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
        await $`git --no-pager diff --no-index --color=always ${options.target!} ${tempTarget}`.noThrow();
      }
    },
    async [Symbol.asyncDispose]() {
      builder.dispose();
      await browser.dispose();
    },
  }
}

export async function doctor(_options: CLIOptions) {
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

  // const { viteDir, cwd, tsconfig, isReactJsx, libraryMode, packageJson, base, gitignore } = await analyzeEnv(Deno.cwd());
  const context = await getProjectContext(Deno.cwd());
  if (context.vite) {
    console.log("✅ vite:", formatFilepath(context.base, context.vite.path));
  } else {
    console.log("❌ vite:", "Project is not setup for vite");
  }

  // if (context) {
  //   const content = await Deno.readTextFile(gitignore.path);
  //   if (content.includes(".previs*")) {
  //     console.log("✅ .gitignore includes .previs*");
  //   } else {
  //     console.log("❌ .gitignore:", "Add .previs* to .gitignore");
  //   }
  // }

  if (context.packageJson) {
    console.log("✅ package.json:", formatFilepath(context.base, context.packageJson.path));
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

  if (context.tsconfig) {
    console.log("✅ tsconfig.json:", formatFilepath(context.base, context.tsconfig.path));
  }

  // if (isReactJsx) {
  //   console.log("✅ compilerOptions.jsx: react-jsx");
  // } else {
  //   console.log("❌ compilerOptions.jsx is not react-jsx");
  // }

  if (context.libraryMode) {
    console.log("Library:", context.libraryMode);
  }

  console.log("Base:", formatFilepath(Deno.cwd(), context.base));
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


async function runTest(options: { testCmd: string[], target: string }) {
  const [cmd, ...args] = options.testCmd;
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

