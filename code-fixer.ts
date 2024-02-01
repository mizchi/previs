// import "https://deno.land/std@0.211.0/dotenv/load.ts";
import { join, $, parseArgs } from "./deps.ts";
import { startBrowser } from "./screenshot/mod.ts";
import { startBuilder } from "./builder/mod.ts";
import { createCodeFixer } from "./fixer/mod.ts";

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
    style: {
      type: 'string',
      short: 's'
    },
    image: {
      type: "boolean",
      short: "i",
    },
    port: {
      type: "string",
      short: "p",
    }
  },
  allowPositionals: true,
});

const tmpdir = Deno.makeTempDirSync();
const screenshotPath = join(tmpdir, "ss.png");[]
const port = options.values.port ? Number(options.values.port) : 3000;
const useImageModel = !!options.values.image;

const screenshotUrl = `http://localhost:${port}/`;
const previewTargetPath = join(Deno.cwd(), options.positionals[0]);
const stylePath = options.values.style ? join(Deno.cwd(), options.values.style) : undefined;

const postBuildAction = async () => { await $`imgcat ${screenshotPath}` };
const builder = await startBuilder({
  width: options.values.width!, height: options.values.height!,
  cwd: Deno.cwd(), target: previewTargetPath, stylePath, port,
});
await builder.ensureBuild();

const browser = await startBrowser(screenshotPath, postBuildAction);

const buildAndScreenshot = async (code: string) => {
  await builder.ensureBuild();
  await browser.screenshot(screenshotUrl);
  if (code) {
    const tmpOutputPath = join(tmpdir, "output.tsx");
    await Deno.writeTextFile(tmpOutputPath, code);
    // console.log("output code:", code, tmpOutputPath);
    // await $`cat ${tmpOutputPath}`;
    await $`bat --language=tsx --style=grid ${tmpOutputPath}`;
  }
};

await buildAndScreenshot('');

const codeFixer = createCodeFixer(previewTargetPath, useImageModel, screenshotPath, buildAndScreenshot);
codeFixer.hookSigintSignal();

// first time
const userPrompt = prompt("[What do you want to fix?]");
if (userPrompt) {
  const initialContent = await Deno.readTextFile(previewTargetPath);
  await codeFixer.fix(initialContent, userPrompt);
}

await codeFixer.cleanup();
builder.cleanup();
await browser.close();
