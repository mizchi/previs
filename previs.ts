import * as commands from "./cli/commands.ts";
import { help, buildOptions } from "./cli/options.ts"
import { cleanup } from "./cli/file_utils.ts";

let isError = false;
let base = Deno.cwd();

try {
  const options = await buildOptions(Deno.cwd(), Deno.args);
  base = options.env.base;
  await cleanup(options.env.base);

  switch (options.command) {
    case "help": {
      help();
      break;
    }
    case "doctor": {
      await commands.doctor(options);
      break;
    }
    case "init": {
      await commands.init(options);
      break;
    }
    case "t":
    case "test":
      await commands.test(options, options.target!);
      break;
    case "screenshot":
    case "ss":
      await commands.screenshot(options, options.target!);
      break;
    case "fix":
      await commands.fix(options, options.target!);
      break;
    case "g":
    case "gen":
    case "generate":
      await commands.generate(options, options.target!);
      break;
    case "serve":
      await commands.serve(options, options.target!);
      break;
  }
} catch (err) {
  console.error(err);
  isError = true;
} finally {
  await cleanup(base);
  // Deno.removeSignalListener("SIGINT", onSignal);
  Deno.exit(isError ? 1 : 0);
}

