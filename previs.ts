import { generate, fix, init, screenshot, serve, doctor, test } from "./commands.ts";
import { join, $, exists } from "./deps.ts";
import { help, getParsedArgs, PrevisOptions } from "./options.ts"
import { analyzeEnv } from "./utils.ts";

const options = getParsedArgs(Deno.args);
// ==== process helper ====
const __disposes: Array<() => void | Promise<void>> = [];
function addHook(disposeFn: () => void | Promise<void>) {
  if (__disposes.length === 0) {
    // hook once
    Deno.addSignalListener("SIGINT", async () => {
      for (const disposeFn of __disposes) {
        try {
          await disposeFn();
        } catch (err) {
          console.error('[previs:hooks:error]', err);
        }
      }
      __disposes.length = 0;
      Deno.exit(1);
    });
  }
  __disposes.push(disposeFn);
}

async function exit(status: number) {
  if (__disposes.length === 0) Deno.exit(status);
  for (const disposeFn of __disposes) {
    try {
      await disposeFn();
    } catch (err) {
      console.error('[previs:hooks:error]', err);
    }
  }
  __disposes.length = 0;
  Deno.exit(status);
}

const __queue = options.values.queue ? options.values.queue.split(",").map(s => s.trim()) : undefined;
async function getInput(message: string): Promise<string | undefined> {
  if (Array.isArray(__queue)) return __queue.shift();
  const result = await $.prompt(message);
  console.log(`${message}: ${result}`);
  return result;
}
async function getConfirm(message: string): Promise<boolean> {
  if (Array.isArray(__queue)) {
    const next = __queue.shift();
    return next === "y" || next === "Y";
  }
  return await $.confirm(message);
}

async function cleanTempFiles(dir: string) {
  for await (const entry of Deno.readDir(dir)) {
    // remove .previs* files
    if (entry.isDirectory && entry.name !== ".previs" && entry.name.startsWith(".previs")) {
      console.log("[previs:clean]", entry.name + '/*');
      await Deno.remove(join(dir, entry.name), { recursive: true, });
    }
    // remove or rollback .bk files
    if (entry.isFile && entry.name.endsWith(".bk")) {
      const backupPath = join(dir, entry.name);
      const originalPath = backupPath.replace(/\.bk$/, "");
      const doRollback = await getConfirm(`[previs] Dirty file exists. Do you want to rollback ${originalPath}?`);
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
    // remove or rollback .bk files
    if (entry.isFile && entry.name.includes(".__previs__.")) {
      const backupPath = join(dir, entry.name);
      const originalPath = backupPath.replace('.__previs__.', ".");
      const doRollback = await getConfirm(`[previs] Dirty file exists. Do you want to rollback ${originalPath}?`);
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
try {
  // pre cleanup
  await cleanTempFiles(Deno.cwd());
  // post cleanup
  addHook(() => cleanTempFiles(Deno.cwd()));

  const env = await analyzeEnv(Deno.cwd());
  const first = options.positionals[0];

  const newOptions: PrevisOptions = {
    ...options.values,
    testCommand: options.testCommand,
    env,
    addHook,
    exit,
    getInput,
    getConfirm,
  };
  if (first === 'doctor') {
    await doctor(newOptions);
    await exit(0);
  } else if (first === 'init') {
    await init(newOptions);
    await exit(0);
  }
  if (commandNamesWithTarget.includes(first)) {
    const second = options.positionals[1];
    if (!second) throw new Error("Please specify target file");
    const target = join(Deno.cwd(), second);
    switch (first) {
      case "t":
      case "test":
        await test(newOptions, target);
        break;
      case "screenshot":
      case "ss":
        await screenshot(newOptions, target);
        break;
      case "fix":
        await fix(newOptions, target);
        break;
      case "g":
      case "gen":
      case "generate":
        await generate(newOptions, target);
        break;
      case "serve":
        await serve(newOptions, target);
        break;
    }
  } else {
    // no command
    const target = join(Deno.cwd(), first);
    if (await exists(target)) {
      // run fix if exists
      console.log("[previs:fix]");
      await fix(newOptions, target);
    } else {
      // run create if file not exists
      console.log("[previs:gen]");
      await generate(newOptions, target);
    }
  }
} catch (err) {
  console.error(err);
  await exit(1);
} finally {
  await exit(0);
}

