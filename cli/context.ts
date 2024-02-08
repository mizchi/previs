import { exists, parseJsonc } from "../deps.ts";
import { findClosest, type Found } from "./file_utils.ts";

type LibraryMode = "react" | "preact" | "qwik" | "svelte" | "vue" | "vanilla";

const JSX_PRAGMA_REGEX = /@jsxImportSource\s+[^\s\*]+/;

export type ProjectContext = {
  base: string;
  vite?: Found;
  tsconfig?: Found;
  packageJson?: Found;
  tailwind?: Found;
  useTailwind: boolean;
  libraryMode: LibraryMode;
  // isReactJsx: boolean;
}

export async function getProjectContext(cwd: string): Promise<ProjectContext> {
  const vite = await findClosest(cwd, 'vite.config', ['.ts', '.js', '.mjs', '.mts']);
  const packageJson = await findClosest(cwd, 'package.json');
  const base = vite?.dir ?? packageJson?.dir ?? cwd;
  const tailwind = await findClosest(base, 'tailwind.config', ['.js', '.cjs', '.mjs']);
  const tsconfig = await findClosest(base, 'tsconfig.json');

  const useTailwind = tailwind?.path ? true : false;

  // let isReactJsx = false;
  const libraryMode: LibraryMode = tsconfig?.path ? await detectLibraryMode(tsconfig.path) : 'react';
  return {
    base,
    vite,
    tsconfig,
    tailwind,
    useTailwind,
    // isReactJsx,
    packageJson,
    libraryMode,
  };
  async function detectLibraryMode(tsconfigPath: string) {
    const content = await Deno.readTextFile(tsconfigPath);
    const config = parseJsonc(content, {
      allowTrailingComma: true,
    });
    // @ts-ignore unchecked json
    if (config.compilerOptions?.jsx) {
      return "react";
    }
    // @ts-ignore unchecked json
    if (config.compilerOptions?.jsxImportSource === "preact") {
      return "preact";
    }
    // @ts-ignore unchecked json
    if (config.compilerOptions?.jsxImportSource === "@builder.io/qwik") {
      return "qwik";
    }
    return 'react';
  }
}

export async function getTargetContext(filepath: string): Promise<LibraryMode | undefined> {
  // TODO: Solid
  // TODO: htmx
  // TODO: html
  if (filepath.endsWith('.svelte')) {
    return 'svelte';
  } else if (filepath.endsWith('.vue')) {
    return 'vue';
  } else if (filepath.endsWith('.tsx') || filepath.endsWith('.jsx')) {
    if (!await exists(filepath)) {
      return undefined;
    }
    const content = await Deno.readTextFile(filepath);
    const jsxPragma = findJsxPragma(content);
    if (jsxPragma === 'preact') {
      return 'preact';
    }
    if (jsxPragma === '@builder.io/qwik') {
      return 'qwik';
    }
  }
  return undefined;

  function findJsxPragma(content: string) {
    const jsxPragma = JSX_PRAGMA_REGEX.exec(content);
    if (jsxPragma) {
      const source = jsxPragma[0].split(" ")[1];
      return source;
    }
    return undefined;
  }
}

