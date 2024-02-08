import { dirname, exists, expandGlob, join } from "../deps.ts";

export async function cleanup(dir: string, options: { debug?: boolean } = {}) {
  for await (const entry of Deno.readDir(dir)) {
    // remove .previs* files
    if (entry.isDirectory && entry.name !== ".previs" && entry.name.startsWith(".previs")) {
      await Deno.remove(join(dir, entry.name), { recursive: true, }).catch(() => { });
      if (options.debug) {
        console.log("[previs:clean]", entry.name + '/*');
      }
    }
    for await (const entry of expandGlob("./**/*.__previs__.*", {
      root: dir,
      exclude: ["node_modules", ".git", '.cache', ''],
    })) {
      await Deno.remove(entry.path, { recursive: true, }).catch(() => { });
    }
  }
}

export type Found = {
  path: string;
  dir: string;
}

export async function findClosestRaw(cwd: string, checker: (currentDir: string) => Promise<string | undefined>): Promise<Found | undefined> {
  let currentDir = cwd;
  while (currentDir !== "/") {
    const found = await checker(currentDir);
    if (found) {
      return {
        dir: currentDir,
        path: found,
      }
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }
  return undefined;
}

export async function findClosest(cwd: string, pattern: string, suffixes: string[] = ['']): Promise<Found | undefined> {
  return await findClosestRaw(cwd, async (currentDir: string) => {
    for (const suffix of suffixes) {
      const targetPath = join(currentDir, `${pattern}${suffix}`);
      if (await exists(targetPath)) {
        return targetPath;
      }
    }
    return undefined;
  });

}

