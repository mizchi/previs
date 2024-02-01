import { join, parseArgs } from "./deps.ts";
import { startBuilder, initializeProject } from "./builder/mod.ts";

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
    // image: {
    //   type: "boolean",
    //   short: "i",
    // },
    port: {
      type: "string",
      short: "p",
      default: "3000",
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
  default: {
    const target = join(Deno.cwd(), options.positionals[0]);
    const style = options.values.style?.map(s => join(Deno.cwd(), s)) ?? []

    const port = options.values.port ? Number(options.values.port) : 3000;
    const builder = await startBuilder({
      width: options.values.width!,
      height: options.values.height!,
      cwd: Deno.cwd(),
      target,
      style,
      port,
    });
    // await viteBuilder.ensureBuild();
    Deno.addSignalListener("SIGINT", () => {
      builder.cleanup();
      Deno.exit(0);
    });
  }
}
