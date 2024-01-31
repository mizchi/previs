import { parseArgs } from "node:util";
import { join } from "https://deno.land/std@0.213.0/path/mod.ts";
import { startPrevis, initializeVolatileProject, findConfigDirectory, detectPreviewType } from "./impl.ts";

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
      short: 's'
    },
    image: {
      type: "boolean",
      short: "i",
    },
    port: {
      type: "string",
      short: "p",
      default: "3000",
    }
  },
  allowPositionals: true,
});

const port = options.values.port ? Number(options.values.port) : 3000;

const cmdOrTarget = options.positionals[0];

if (cmdOrTarget === "init") {
  const config = await findConfigDirectory(Deno.cwd());
  if (!config) {
    console.log("config not found");
    Deno.exit(1);
  }

  const previewType = detectPreviewType(config.configPath!);
  const stylePath = options.values.style ? join(Deno.cwd(), options.values.style) : undefined;

  await initializeVolatileProject({
    width: options.values.width!,
    height: options.values.height!,
    isViteProject: true,
    dir: config.dir,
    configPath: config.configPath!,
    volatile: false,
    stylePath: stylePath,
    forceRewrite: false,
    previewType,
  });
  Deno.exit(0);
}

// Run preview
{
  const previewTargetPath = join(Deno.cwd(), options.positionals[0]);
  const stylePath = options.values.style ? join(Deno.cwd(), options.values.style) : undefined;

  const viteBuilder = await startPrevis({
    width: options.values.width!,
    height: options.values.height!,
    ignore: options.values.ignore,
    cwd: Deno.cwd(),
    previewTargetPath,
    stylePath,
    port,
    volatile: true,
    force: options.values.force,
  });

  // await viteBuilder.ensureBuild();

  Deno.addSignalListener("SIGINT", () => {
    viteBuilder.close();
    Deno.exit(0);
  });

}