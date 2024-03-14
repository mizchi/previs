import { generateDtsBundle } from "npm:dts-bundle-generator@9.3.1"
import { join, dirname } from "../deps.ts";

const tmpTsconfigContent = `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true /* Enable all strict type-checking options. */,
    "skipLibCheck": true /* Skip type checking all .d.ts files. */
  }
}
`;

async function findTsConfigFile(filePath: string): Promise<string | undefined> {
  let currentPath = filePath;
  while (true) {
    const tsConfigPath = join(currentPath, "tsconfig.json");
    try {
      await Deno.stat(tsConfigPath);
      return tsConfigPath;
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        const parentPath = join(currentPath, "..");
        if (parentPath === currentPath) {
          return undefined;
        }
        currentPath = parentPath;
      } else {
        throw err;
      }
    }
  }
}

export async function getBundledDtsForFile(filePath: string): Promise<string> {
  const originalTsConfigPath = await findTsConfigFile(dirname(filePath));
  const tmpTsConfigPath = originalTsConfigPath ? undefined : join(dirname(filePath), "dts-tmp-tsconfig.json");
  let result: string;
  try {
    // let tmpTsconfigPath = 
    if (tmpTsConfigPath) {
      // throw new Error("Could not find a tsconfig.json file");
      console.log("[warn] Could not find a tsconfig.json file. Generating a temporary one.");
      await Deno.writeTextFile(tmpTsConfigPath, tmpTsconfigContent);
    }
    const results = generateDtsBundle([{ filePath }], {
      followSymlinks: true,
      preferredConfigPath: tmpTsConfigPath
    });
    result = results[0];
  } finally {
    if (tmpTsConfigPath) {
      await Deno.remove(tmpTsConfigPath);
    }
  }
  return result;
}
