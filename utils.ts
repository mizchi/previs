import { dirname, exists, join, parseJsonc, extname, basename, expect } from "./deps.ts";

const VITE_CONFIG_EXTENTIONS = [
  '.ts',
  '.js',
  '.mjs',
  '.mts',
];

type LibraryMode = "react" | "preact" | "qwik" | "svelte" | "vue" | "vanilla";

const JSX_PRAGMA_REGEX = /@jsxImportSource\s+[^\s\*]+/;

export async function findClosest(cwd: string, checker: (currentDir: string) => Promise<string | undefined>): Promise<{
  dir: string;
  path: string;
} | undefined> {
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

export async function findViteProjectDirectory(cwd: string) {
  const viteChecker = async (currentDir: string) => {
    for (const ext of VITE_CONFIG_EXTENTIONS) {
      const configPath = join(currentDir, `vite.config${ext}`);
      if (await exists(configPath)) {
        return configPath;
      }
    }
    return undefined;
  };
  return await findClosest(cwd, viteChecker);
}

export async function findNodeModulesDirectory(cwd: string) {
  const modulesChecker = async (currentDir: string) => {
    const configPath = join(currentDir, `node_modules`);
    if (await exists(configPath)) {
      return configPath;
    }
    return undefined;
  };
  return await findClosest(cwd, modulesChecker);
}

export async function findVscodeSettingsDirectory(cwd: string) {
  const viteChecker = async (currentDir: string) => {
    const vscodePath = join(currentDir, `.vscode`);
    if (await exists(vscodePath)) {
      return vscodePath;
    }
    return undefined;
  };
  return await findClosest(cwd, viteChecker);
}

export async function findPackageJson(cwd: string) {
  const packageJsonChecker = async (currentDir: string) => {
    const configPath = join(currentDir, 'package.json');
    if (await exists(configPath)) {
      return configPath;
    }
    return undefined;
  };
  return await findClosest(cwd, packageJsonChecker);
}

export async function findTsconfigJson(cwd: string) {
  const packageJsonChecker = async (currentDir: string) => {
    const configPath = join(currentDir, 'tsconfig.json');
    if (await exists(configPath)) {
      return configPath;
    }
    return undefined;
  };
  return await findClosest(cwd, packageJsonChecker);
}

export async function findTailwindConfig(cwd: string) {
  const packageJsonChecker = async (currentDir: string) => {
    const configPath = join(currentDir, 'tailwind.config.js');
    if (await exists(configPath)) {
      return configPath;
    }
    return undefined;
  };
  return await findClosest(cwd, packageJsonChecker);
}

export async function analyzeTarget(filepath: string) {
  // TODO: Solid
  // TODO: htmx
  let library: LibraryMode = 'vanilla';
  if (filepath.endsWith('.svelte')) {
    library = 'svelte';
  } else if (filepath.endsWith('.vue')) {
    library = 'vue';
  } else {
    const content = await Deno.readTextFile(filepath);
    const jsxPragma = findJsxPragma(content);
    if (jsxPragma === 'preact') {
      library = 'preact';
    }
    if (jsxPragma === '@builder.io/qwik') {
      library = 'qwik';
    }
    library = 'react';
  }
  return {
    library,
  }

  function findJsxPragma(content: string) {
    const jsxPragma = JSX_PRAGMA_REGEX.exec(content);
    if (jsxPragma) {
      const source = jsxPragma[0].split(" ")[1];
      return source;
    }
    return undefined;
  }
}

export type AnalyzedEnv = ReturnType<typeof analyzeEnv>;
export async function analyzeEnv(cwd: string) {
  const viteDir = await findViteProjectDirectory(cwd);
  // const nodeModulesDir = await findNodeModulesDirectory(cwd);
  // const vscodeDir = await findVscodeSettingsDirectory(cwd);
  const packageJson = await findPackageJson(cwd);
  const tailwindConfig = await findTailwindConfig(cwd);
  const tsconfig = await findTsconfigJson(cwd);

  const useTailwind = tailwindConfig?.path ? true : false;
  let isReactJsx = false;
  let libraryMode: LibraryMode = "react";
  if (tsconfig?.path) {
    const content = await Deno.readTextFile(tsconfig.path);
    const config = parseJsonc(content, {
      allowTrailingComma: true,
    });
    // @ts-ignore unchecked json
    if (config.compilerOptions?.jsx) {
      libraryMode = "react";
    }
    // @ts-ignore unchecked json
    if (config.compilerOptions?.jsxImportSource === "preact") {
      libraryMode = "preact";
    }
    // @ts-ignore unchecked json
    if (config.compilerOptions?.jsxImportSource === "@builder.io/qwik") {
      libraryMode = "qwik";
    }

    // @ts-ignore unchecked json
    if (config.compilerOptions?.jsx === "react-jsx") {
      // this is active on react and qwik
      isReactJsx = true;
    }
  }
  const base = viteDir?.dir ?? packageJson?.dir ?? cwd;
  return {
    base,
    cwd,
    viteDir,
    tsconfig,
    useTailwind,
    // nodeModulesDir,
    // vscodeDir,
    isReactJsx,
    packageJson,
    // tailwindConfig,
    libraryMode,
  };
}

export function getTempFilepath(filepath: string) {
  const ext = extname(filepath);
  const base = basename(filepath);
  const newPath = join(dirname(filepath), base.replace(ext, `.__previs__${ext}`));
  return newPath;
}
Deno.test('getTempFilepath', () => {
  expect(getTempFilepath('/tmp/foo/bar.ts')).toEqual('/tmp/foo/bar.__previs__.ts');
  expect(getTempFilepath('/tmp/foo/bar.test.ts')).toEqual('/tmp/foo/bar.test.__previs__.ts');
  expect(getTempFilepath('/tmp/foo/bar_test.ts')).toEqual('/tmp/foo/bar_test.__previs__.ts');
});

export function getExportedComponent(filepath: string) {
  const ext = extname(filepath);
  const base = basename(filepath);
  return base.replace(ext, '').replace(/\-/g, '').split('.')[0].toLowerCase();
}
Deno.test('getExportedComponent', () => {
  expect(getExportedComponent('/tmp/button.tsx')).toEqual('button');
  expect(getExportedComponent('/tmp/button-xxx.tsx')).toEqual('buttonxxx');
  expect(getExportedComponent('/tmp/button.xxx.tsx')).toEqual('button');
  expect(getExportedComponent('/tmp/Button.tsx')).toEqual('button');
});