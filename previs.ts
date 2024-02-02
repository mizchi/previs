import { join, parseArgs, $, exists } from "./deps.ts";
import { startBuilder, initializeProject } from "./builder/mod.ts";
import { startBrowser } from "./screenshot/mod.ts";
import { createFixer } from "./fixer/mod.ts";

const defaultPort = "3434"

// TODO: separte init and run options
const options = parseArgs({
  args: Deno.args,
  options: {
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
      // default: "100%",
    },
    height: {
      type: "string",
      short: "h",
      // default: "100%",
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
    const port = Number(options.values.port || defaultPort);
    const builder = await runBuilder(target);

    // run ss-browser
    const tmpdir = Deno.makeTempDirSync();
    const screenshotPath = join(tmpdir, "ss.png");[]
    const screenshotUrl = `http://localhost:${port}/`;
    await builder.ensureBuild();
    const scale = options.values.scale ?? typeof options.values.scale === "string" ? Number(options.values.scale) : undefined;
    const browser = await startBrowser({ screenshotPath, scale, debug: options.values.debug });
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
    const onScreenshot = async () => {
      if (await hasCommand("imgcat")) {
        await $`imgcat ${screenshotPath}`;
      }
    };
    const scale = options.values.scale ?? typeof options.values.scale === "string" ? Number(options.values.scale) : undefined;
    const browser = await startBrowser({
      screenshotPath,
      onScreenshot,
      scale,
      debug: options.values.debug
    });
    const buildAndScreenshot = async () => {
      await builder.ensureBuild();
      await browser.screenshot(screenshotUrl);
      if (await hasCommand("bat")) {
        const backupOriginalPath = target + '.bk';
        if (await exists(backupOriginalPath)) {
          await $`git --no-pager diff --no-index --color=always ${target} ${backupOriginalPath}`.noThrow();
        } else {
          await $`bat --language=tsx --style=grid --paging=never ${target}`;
        }
      } else {
        await $`cat ${target}`;
      }
    };

    await buildAndScreenshot();

    const useImageModel = false;
    const printRaw = !!options.values.printRaw;
    const fixer = createFixer({
      target,
      useImageModel,
      screenshotPath,
      printRaw,
      action: buildAndScreenshot
    });
    fixer.hookSigintSignal();

    // first time
    const userRequest = await $.prompt("What do you want to fix?");
    if (userRequest) {
      const initialContent = await Deno.readTextFile(target);
      await fixer.fix(initialContent, userRequest);
    }
    await fixer.cleanup();
    builder.cleanup();
    await browser.close();
    break;
  }

  case "create": {
    const second = options.positionals[1];
    if (!second) {
      console.error("Please specify target file");
      Deno.exit(1);
    }
    const target = join(Deno.cwd(), second);
    // create a tmp file
    await Deno.writeTextFile(target, `export default function () {\n  return <div>Hello</div>\n}`);

    const port = Number(options.values.port || defaultPort);
    const builder = await runBuilder(target);

    // run ss-browser
    const tmpdir = Deno.makeTempDirSync();
    const screenshotPath = join(tmpdir, "ss.png");[]
    const screenshotUrl = `http://localhost:${port}/`;
    await builder.ensureBuild();
    const onScreenshot = async () => {
      if (await hasCommand("imgcat")) {
        await $`imgcat ${screenshotPath}`;
      }
    };
    const scale = options.values.scale ?? typeof options.values.scale === "string" ? Number(options.values.scale) : undefined;
    const browser = await startBrowser({
      screenshotPath,
      onScreenshot,
      scale,
      debug: options.values.debug
    });
    const buildAndScreenshot = async () => {
      await builder.ensureBuild();
      await browser.screenshot(screenshotUrl);
      if (await hasCommand("bat")) {
        const originalPath = target + '.bk';
        if (await exists(originalPath)) {
          await $`git --no-pager diff --no-index --color=always ${originalPath} ${target}`.noThrow();
        } else {
          await $`bat --language=tsx --style=grid --paging=never ${target}`;
        }
      } else {
        await $`cat ${target}`;
      }
    };

    // await buildAndScreenshot();

    const useImageModel = false;
    const printRaw = !!options.values.printRaw;
    const fixer = createFixer({
      target,
      useImageModel,
      screenshotPath,
      printRaw,
      action: buildAndScreenshot
    });
    fixer.hookSigintSignal();

    // first time
    const request = await $.prompt("What is this component?");
    if (!request) break;

    const newCode = await fixer.create(target, request);
    await Deno.writeTextFile(target, newCode);

    if (await hasCommand("bat")) {
      await $`bat --language=tsx --style=grid --paging=never ${target}`;
    } else {
      await $`cat ${target}`;
    }

    const response = await $.prompt("Accept？ [y/N/Request]");
    if (response === "N") {
      await Deno.remove(target);
      break;
    }

    if (response === "y" || response === "Y") {
      await Deno.writeTextFile(target, newCode);
    }

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
    width: options.values.width ?? "fit-content",
    height: options.values.height ?? "fit-content",
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

