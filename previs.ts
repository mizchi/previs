import { commands, cleanup, buildOptions, getProjectContext } from "./cli/mod.ts";

let isError = false;

let base = Deno.cwd();
try {
  const ctx = await getProjectContext(base);
  base = ctx.base;
  const options = buildOptions(base, Deno.args);
  await cleanup(ctx.base);
  const cmd = commands[options.command];
  if (cmd) {
    await cmd(options, ctx);
  } else {
    new Error(`Command not found: ${options.command}`);
  }
} catch (err) {
  console.error(err);
  isError = true;
} finally {
  await cleanup(base);
  // Deno.removeSignalListener("SIGINT", onSignal);
  Deno.exit(isError ? 1 : 0);
}

