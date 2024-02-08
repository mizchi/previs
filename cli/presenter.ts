import { readFile } from "node:fs/promises";
import { join, $ } from "../deps.ts";
import { startBuilder } from "../mod.ts";
import { startBrowser } from "../screenshot/mod.ts";
import { pxToNumber } from "../utils.ts";
import { CLIOptions } from "./options.ts";

const defaultPort = "3434";

export async function startPresenter(target: string, options: CLIOptions) {
  const imports = options.import?.map(s => join(Deno.cwd(), s)) ?? []

  const builder = await startBuilder({
    cwd: Deno.cwd(),
    target,
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
    } else if (await hasCmd("code")) {
      await $`code ${screenshotPath}`;
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
    },
    async [Symbol.asyncDispose]() {
      builder.dispose();
      await browser.dispose();
    },
  }
}

async function hasCmd(command: string) {
  const ret = await $`which ${command}`.noThrow().quiet();
  return ret.code === 0;
}
