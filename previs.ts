import { create, fix, init, screenshot, serve } from "./commands.ts";
import { join, $, exists } from "./deps.ts";
// import { startBuilder, initializeProject } from "./builder/mod.ts";
// import { startBrowser } from "./screenshot/mod.ts";
// import { createFixer } from "./fixer/mod.ts";
import { help, getParsedArgs, PrevisOptions } from "./options.ts"

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
  return await $.prompt(message);
}
async function getConfirm(message: string): Promise<boolean> {
  if (Array.isArray(__queue)) {
    const next = __queue.shift();
    return next === "y";
  }
  return await $.confirm(message);
}

async function cleanTempFiles(dir: string) {
  for await (const entry of Deno.readDir(dir)) {
    // remove .previs* files
    if (entry.isDirectory && entry.name !== ".previs" && entry.name.startsWith(".previs")) {
      console.log("[previs:clean]", entry.name + '/*');
      await Deno.remove(join(dir, entry.name), {
        recursive: true,
      });
    }
    // remove .bk files
    if (entry.isFile && entry.name.endsWith(".bk")) {
      console.log("[previs:clean]", entry.name);
      await Deno.remove(join(dir, entry.name));
    }
  }
}

// ==== commands ====


// run!

if (options.values.help) {
  help();
  Deno.exit(0);
}

const commandNamesWithTarget = [
  "doctor",
  "init",
  "screenshot",
  "ss",
  "fix",
  "create",
  "serve",
];
try {
  // pre cleanup
  await cleanTempFiles(Deno.cwd());
  // post cleanup
  addHook(() => cleanTempFiles(Deno.cwd()));

  const first = options.positionals[0];

  const newOptions: PrevisOptions = {
    ...options.values,
    addHook,
    exit,
    getInput,
    getConfirm,
  };
  if (first === 'doctor') {
    console.log("Doctor is not implemented yet");
    await exit(0);
  } else if (first === 'init') {
    await init(newOptions);
    await exit(0);
  }
  const withTarget = commandNamesWithTarget.includes(first);
  if (withTarget) {
    const second = options.positionals[1];
    if (!second) throw new Error("Please specify target file");
    const target = join(Deno.cwd(), second);
    switch (first) {
      case "screenshot":
      case "ss":
        await screenshot(newOptions, target);
        break;
      case "fix":
        await fix(newOptions, target);
        break;
      case "create":
        await create(newOptions, target);
        break;
      case "serve":
        await serve(newOptions, target);
        break;
    }
  }

  // no args
  const target = join(Deno.cwd(), first);
  if (await exists(target)) {
    // run fix if exists
    console.log("[previs:fix]");
    await fix(newOptions, target);
  } else {
    // run create if file not exists
    console.log("[previs:create]");
    await create(newOptions, target);
  }
} catch (err) {
  console.error(err);
  await exit(1);
} finally {
  await exit(0);
}

