import { startBuilder } from "../builder/mod.ts";
import { join, $, exists, basename } from "../deps.ts";
import { getFixedComponent, getFixedCode, getNewComponent, getNewCode, FixOptions } from "../fixer/mod.ts";
import { CLIOptions, getHelpText } from "./options.ts";
import { formatFilepath, getTempFilepath, isPreviewableCode, pxToNumber } from "../utils.ts";
import { ProjectContext, getProjectContext, getTargetContext } from "./context.ts";
import { startPresenter } from "./presenter.ts";
import { multiSelect, nodePackageInstalled } from "./cli_utils.ts";
import { ComponentFlag } from "../fixer/types.ts";

const defaultPort = "3434";
const DEFAULT_MAX_TEST_RETRIES = 3;

// deno-lint-ignore require-await
export async function init(_options: CLIOptions, _ctx: ProjectContext) {
  throw new Error("Not implemented");
}

export async function screenshot(options: CLIOptions, ctx: ProjectContext) {
  await using presenter = await startPresenter(options.target!, options, ctx);
  await presenter.screenshot();
  if (await hasCmd("imgcat")) {
    const width = options.width ? pxToNumber(options.width) : 400;
    await $`imgcat -W ${width}px ${presenter.getScreenshotPath()}`;
  }
}

export async function fix(options: CLIOptions, ctx: ProjectContext) {
  const originalTarget = options.target!;
  const uiMode = !originalTarget.endsWith(".ts");
  const vision = !!options.vision && uiMode;
  const tempTarget = getTempFilepath(originalTarget);
  const tailwind = ctx.useTailwind;
  const library = await getTargetContext(originalTarget) ?? ctx.libraryMode;
  const auto = options.auto;

  // validation
  if (auto && !options.testCmd) {
    throw new Error("testCmd is required for auto mode");
  }
  let currentCode = "";
  let currentRequest: string | undefined = options.request;
  // let errorText: string | undefined = undefined;
  let testRetryCount = 0;
  const preExists = await exists(originalTarget);

  // fix mode
  if (preExists) {
    currentCode = await Deno.readTextFile(originalTarget);
  } else {
    console.log('%cprevis start new file generation', 'color: #0f0');
    // generation mode
    const filename = basename(originalTarget);
    const newRequest = currentRequest ?? ctx.getInput("new>", `Create ${filename}`);
    if (!newRequest) {
      return;
    }
    // consnume
    if (currentRequest) {
      currentRequest = undefined;
    }
    if (uiMode) {
      const newComponentFlags = await multiSelect('includes...', [
        { text: "In-Source Testing (Vitest)", selected: !!options.testCmd, value: 'in-source-test' },
        { text: "Include __Preview__", selected: true, value: 'preview-component' },
        { text: 'Use tailwind', selected: tailwind, value: 'tailwind' },
        { text: "export default", selected: false, value: 'export-default' },
      ]) as ComponentFlag[];
      currentCode = await getNewComponent({
        target: originalTarget,
        request: newRequest!,
        tailwind,
        library: library,
        debug: options.debug,
        model: options.model,
        printPrompt: !!options.printPrompt,
        vision,
        getImage: () => ui?.getBase64Image()!,
      }, newComponentFlags);
    } else {
      currentCode = await getNewCode({
        model: options.model,
        target: originalTarget,
        request: newRequest!,
        debug: !!options.debug,
        printPrompt: !!options.printPrompt,
      });
    }
  }

  // validation
  if (auto && !uiMode) {
    throw new Error("auto mode is only supported for ui mode");
  }

  // create temp file and run test
  {
    await Deno.writeTextFile(tempTarget, currentCode);

    // run test
    if (options.testCmd) {
      console.log('%cprevis running test', 'color: #0f0');
      const result = await runTest(tempTarget, { testCmd: options.testCmd });
      // console.log('error', {
      //   code: result.code,
      //   stderr: result.stderr,
      //   stdout: result.stdout,
      // })
      const errorText = result.code === 0 ? undefined : result.stderr;
      if (errorText) {
        testRetryCount++;
      } else {
        testRetryCount = 0;
      }
      currentRequest = "Fix test errors.\n\n" + errorText;
    }
  }

  // start presenter
  await using ui = uiMode ? await startPresenter(tempTarget, options, ctx) : null;
  await Deno.writeTextFile(tempTarget, currentCode);

  if (isPreviewableCode(currentCode, originalTarget)) {
    await ui?.screenshot();
  }
  if (!uiMode) {
    await printCode(tempTarget);
  }

  let request;
  // inintial request for existing file
  if (preExists) {
    request = currentRequest ?? ctx.getInput("fix>");
    if (!request) {
      await Deno.remove(tempTarget);
      return;
    };
  } else {
    request = currentRequest ?? ctx.getInput("Accept? [y/n/<fix>]");
    if (request?.toLowerCase() === "y") {
      // Overwrite original
      await Deno.rename(tempTarget, originalTarget);
      return;
    }
    if (request?.toLowerCase() === "n") {
      await Deno.remove(tempTarget);
      return;
    }
  }

  if (!request) return;

  // start fixing loop
  while (true) {
    const fixOptions: FixOptions = {
      code: currentCode,
      target: originalTarget,
      model: options.model,
      request: request!,
      debug: !!options.debug,
      printPrompt: !!options.printPrompt,
    };
    currentCode = uiMode
      ? await getFixedComponent({
        ...fixOptions,
        vision,
        library,
        tailwind,
        getImage: () => ui!.getBase64Image(),
      }, ['preview-component'])
      : await getFixedCode(fixOptions);
    // save and screenshot
    await Deno.writeTextFile(tempTarget, currentCode);

    // run test for temp file
    if (options.testCmd) {
      const testResult = await runTest(tempTarget, { testCmd: options.testCmd });
      const errorText = testResult.code === 0 ? undefined : testResult.stderr;
      if (errorText) {
        currentRequest = "Fix test errors.\n\n" + errorText;
        testRetryCount++;
        if (testRetryCount >= DEFAULT_MAX_TEST_RETRIES) {
          console.log("Test failed too many times. Exiting.");
          break;
        }
        continue;
      } else {
        testRetryCount = 0;
      }
    }

    // display screenshot
    if (isPreviewableCode(currentCode, originalTarget)) {
      await ui?.screenshot();
    }
    if (!options.noPrint && await hasCmd("git")) {
      await $`git --no-pager diff --no-index --color=always ${originalTarget} ${tempTarget}`.noThrow();
    }

    // if autoMode, overwrite original and exit
    if (auto) {
      await Deno.rename(tempTarget, originalTarget);
      break;
    }
    // get new request
    request = ctx.getInput("Accept? [y/n/<fix>]");
    if (request?.toLowerCase() === "y") {
      // Overwrite original
      await Deno.rename(tempTarget, originalTarget);
      break;
    }
    if (request?.toLowerCase() === "n") {
      await Deno.remove(tempTarget);
      break;
    }
    // currentCode = newCode;
  }
}

export async function test(options: CLIOptions, _ctx: ProjectContext) {
  if (!options.testCmd) {
    throw new Error("testCmd is not set");
  }
  const [cmd, ...args] = options.testCmd;
  const newArgs = args.map(s => s.replace('__FILE__', options.target!));

  const testResult = await $`${cmd} ${newArgs}`.noThrow();
  if (testResult.code === 0) {
    console.log("[previs] test passed");
  } else {
    // test failed
    console.log("[previs] test failed");
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

// deno-lint-ignore require-await
export async function help(_options: CLIOptions, _ctx: ProjectContext) {
  const helpText = getHelpText();
  console.log(helpText);
}

export async function doctor(_options: CLIOptions) {
  await checkInstalled('git', 'Please install git');
  await checkInstalled('code', 'Please install vscode cli. https://code.visualstudio.com/docs/editor/command-line');
  await checkInstalled('imgcat', 'Please install imgcat.\nDownload https://iterm2.com/utilities/imgcat and chmod +x in PATH');
  await checkInstalled('bat', 'Please install bat. https://github.com/sharkdp/bat');

  await checkNodePackageInstalled("vite");
  await checkNodePackageInstalled("vitest");

  const apiKey = Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("PREVIS_OPENAI_API_KEY")
  if (apiKey) {
    console.log("✅ PREVIS_OPENAI_API_KEY is set");
  } else {
    console.log("❌ PREVIS_OPENAI_API_KEY is not set. Please set it in .env or environment variable");
  }

  const context = await getProjectContext(Deno.cwd());
  if (context.vite) {
    console.log("✅ vite:", formatFilepath(context.base, context.vite.path));
  } else {
    console.log("❌ vite:", "Project is not setup for vite");
  }

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
    if (context.libraryMode === "react") {
      await checkNodePackageInstalled("react");
      await checkNodePackageInstalled("react-dom");
    }

    if (context.libraryMode === "vue") {
      await checkNodePackageInstalled("vue");
    }

    if (context.libraryMode === "svelte") {
      await checkNodePackageInstalled("svelte");
    }

    if (context.libraryMode === "preact") {
      await checkNodePackageInstalled("preact");
    }
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

  async function checkNodePackageInstalled(pkg: string) {
    const failMessage = `Please install ${pkg}: npm install ${pkg} --save-dev`;
    if (await nodePackageInstalled(pkg)) {
      console.log(`✅ node: ${pkg}`);
      return true;
    } else {
      console.log(`❌ node: ${pkg}:`, failMessage);
      return false;
    }
  }

  // TODO: Check puppeteer
  // TODO: Check deno version
  // TODO: Check vite environment
  // TODO: Check node_modules
  // TODO: Check tailwindcss
}

async function runTest(target: string, options: { testCmd: string[] }) {
  const [cmd, ...args] = options.testCmd;
  const newArgs = args.map(s => s.replace('__FILE__', target));
  const testResult = await $`${cmd} ${newArgs}`.noThrow().stderr("inheritPiped").stdout("inheritPiped");
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

