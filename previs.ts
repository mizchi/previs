import { join, parseArgs, $ } from "./deps.ts";
import { startBuilder, initializeProject } from "./builder/mod.ts";
import { startBrowser } from "./screenshot/mod.ts";
import { createFixer } from "./fixer/mod.ts";

const defaultPort = "3434"

// TODO: separte init and run options
const options = parseArgs({
  args: Deno.args,
  options: {
    width: {
      type: "string",
      short: "w",
      default: "100%",
    },
    height: {
      type: "string",
      short: "h",
      default: "100%",
    },
    ignore: {
      type: "boolean",
      short: "i",
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
    // image: {
    //   type: "boolean",
    //   short: "i",
    // },
    port: {
      type: "string",
      short: "p",
      default: defaultPort,
    }
  },
  allowPositionals: true,
});

const first = options.positionals[0];

switch (first) {
  case "init": {
    const virtualRoot = join(Deno.cwd(), ".previs");
    await initializeProject({
      width: options.values.width!,
      height: options.values.height!,
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
    const port = Number(options.values.port || defaultPort);
    const builder = await runBuilder(target);

    // run ss-browser
    const tmpdir = Deno.makeTempDirSync();
    const screenshotPath = join(tmpdir, "ss.png");[]
    const screenshotUrl = `http://localhost:${port}/`;
    await builder.ensureBuild();
    const browser = await startBrowser(screenshotPath);
    await browser.screenshot(screenshotUrl);
    if (await hasCommand("imgcat")) {
      await $`imgcat ${screenshotPath}`;
    }

    // cleanup
    await browser.close();
    builder.cleanup();
    break;
  }

  case "fix": {
    const second = options.positionals[1];
    if (!second) {
      console.error("Please specify target file");
      Deno.exit(1);
    }
    const target = join(Deno.cwd(), second);
    const port = Number(options.values.port || defaultPort);
    const builder = await runBuilder(target);

    // run ss-browser
    const tmpdir = Deno.makeTempDirSync();
    const screenshotPath = join(tmpdir, "ss.png");[]
    const screenshotUrl = `http://localhost:${port}/`;
    await builder.ensureBuild();
    const onBuildEnd = async () => {
      if (await hasCommand("imgcat")) {
        await $`imgcat ${screenshotPath}`;
      }
    };
    const browser = await startBrowser(screenshotPath, onBuildEnd);
    const buildAndScreenshot = async (code: string) => {
      await builder.ensureBuild();
      await browser.screenshot(screenshotUrl);
      if (code) {
        const tmpOutputPath = join(tmpdir, "output.tsx");
        await Deno.writeTextFile(tmpOutputPath, code);
        if (await hasCommand("bat")) {
          await $`bat --language=tsx --style=grid ${tmpOutputPath}`;
        }
        // TODO: use batdiff
        // if (await hasCommand("batdiff")) {
        //   await $`bat --language=tsx --style=grid ${tmpOutputPath}`;
        // }

      }
    };

    await buildAndScreenshot('');

    const useImageModel = false;
    const printRaw = !!options.values.printRaw;
    const codeFixer = createFixer({
      target,
      useImageModel,
      screenshotPath,
      printRaw,
      action: buildAndScreenshot
    });
    codeFixer.hookSigintSignal();

    // first time
    const userPrompt = prompt("[What do you want to fix?]");
    if (userPrompt) {
      const initialContent = await Deno.readTextFile(target);
      await codeFixer.fix(initialContent, userPrompt);
    }
    await codeFixer.cleanup();
    builder.cleanup();
    await browser.close();
    break;
  }

  default: {
    const target = join(Deno.cwd(), first);
    const builder = await runBuilder(target);
    // await viteBuilder.ensureBuild();
    Deno.addSignalListener("SIGINT", () => {
      builder.cleanup();
      Deno.exit(0);
    });
  }
}

async function runBuilder(target: string) {
  const style = options.values.style?.map(s => join(Deno.cwd(), s)) ?? []
  const port = Number(options.values.port || defaultPort);

  return await startBuilder({
    width: options.values.width!,
    height: options.values.height!,
    cwd: Deno.cwd(),
    target,
    style,
    port,
  });
}

async function hasCommand(command: string) {
  const ret = await $`which ${command}`.noThrow().quiet();
  return ret.code === 0;
}

