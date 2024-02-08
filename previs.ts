import { generate, fix, init, screenshot, serve, doctor, test } from "./commands.ts";
import { join, exists } from "./deps.ts";
import { help, getParsedArgs, PrevisOptions } from "./options.ts"
import { analyzeEnv } from "./utils.ts";

const options = getParsedArgs(Deno.args);

function getInput(message: string): string | undefined {
  const handler = () => {
    // ignore
  };
  Deno.addSignalListener('SIGINT', handler);
  const ret = prompt(message);
  Deno.removeSignalListener('SIGINT', handler);
  if (ret === null) return undefined;
  return ret;
}

function getConfirm(message: string): boolean {
  const out = prompt(`${message} [y/n]`);
  if (out === null || out.toLowerCase() === 'n') {
    return false;
  }
  return out.toLowerCase() === 'y';
}

async function cleanTempFiles(dir: string) {
  for await (const entry of Deno.readDir(dir)) {
    // remove .previs* files
    if (entry.isDirectory && entry.name !== ".previs" && entry.name.startsWith(".previs")) {
      console.log("[previs:clean]", entry.name + '/*');
      await Deno.remove(join(dir, entry.name), { recursive: true, });
    }
    // remove or rollback
    if (entry.isFile && entry.name.includes(".__previs__.")) {
      const backupPath = join(dir, entry.name);
      const originalPath = backupPath.replace('.__previs__.', ".");
      const doRollback = getConfirm(`[previs] rollback? ${originalPath}?`);
      if (doRollback) {
        const backupContent = await Deno.readTextFile(backupPath);
        await Deno.writeTextFile(originalPath, backupContent);
        await Deno.remove(backupPath);
        console.log("[previs:rollback]", originalPath);
        console.log("[previs:clean]", backupPath);
      } else {
        await Deno.remove(backupPath);
        console.log("[previs:clean]", backupPath);
      }
    }
  }
}

// run
if (options.positionals.length === 0 || options.values.help) {
  help();
  Deno.exit(0);
}

const commandNamesWithTarget = [
  "doctor",
  "init",
  "test",
  "screenshot",
  "ss",
  "fix",
  "g",
  "gen",
  "generate",
  "serve",
];

let isError = false;

try {
  await cleanTempFiles(Deno.cwd());
  // Deno.addSignalListener("SIGINT", onSignal);

  const env = await analyzeEnv(Deno.cwd());
  const first = options.positionals[0];

  const previsOptions: PrevisOptions = {
    ...options.values,
    testCommand: options.testCommand,
    env,
    getInput,
    getConfirm,
  };
  if (first === 'doctor') {
    await doctor(previsOptions);
    // Deno.exit(0);
  } else if (first === 'init') {
    await init(previsOptions);
    // Deno.exit(0);
  } else if (commandNamesWithTarget.includes(first)) {
    const second = options.positionals[1];
    if (!second) throw new Error("Please specify target file");
    const target = join(Deno.cwd(), second);
    // tempTarget = getTempFilepath(target);
    switch (first) {
      case "t":
      case "test":
        await test(previsOptions, target);
        break;
      case "screenshot":
      case "ss":
        await screenshot(previsOptions, target);
        break;
      case "fix":
        await fix(previsOptions, target);
        break;
      case "g":
      case "gen":
      case "generate":
        await generate(previsOptions, target);
        break;
      case "serve":
        await serve(previsOptions, target);
        break;
    }
  } else {
    // no command
    const target = join(Deno.cwd(), first);
    // tempTarget = getTempFilepath(target);
    if (await exists(target)) {
      // run fix if exists
      console.log("[previs:fix]");
      await fix(previsOptions, target);
    } else {
      // run create if file not exists
      console.log("[previs:gen]");
      await generate(previsOptions, target);
    }
  }
} catch (err) {
  console.error(err);
  isError = true;
} finally {
  await cleanTempFiles(Deno.cwd());
  // Deno.removeSignalListener("SIGINT", onSignal);
  Deno.exit(isError ? 1 : 0);
}

