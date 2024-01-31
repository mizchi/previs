import { relative, dirname, join, basename, exists, createServer, Plugin } from './deps.ts';

type PrevisOption = {
  cwd: string;
  previewTargetPath: string;
  port: number;
  width: string;
  height: string;
  stylePath?: string | undefined;
  force?: boolean;
  volatile?: boolean;
  ignore?: boolean;
};

const ENTRY_FILE_NAME = "entry.preview.tsx";
const VIRTUAL_ROOT_DIR = ".previs";
const TARGET_MARKER = "__TARGET__";

export enum PreviewType {
  React = "react",
  Svelte = "svelte",
  Vue = "vue",
}

function buildPreviewConfig(base: string) {
  return `import config from '../${base}';
export default {
  ...config,
  define: {
    ...config.define,
    "import.meta.main": JSON.stringify(false),
  }
};
`;
}

function buildVanillaConfig() {
  return `// generated
import { defineConfig } from 'npm:vite@5.0.11';
export default defineConfig({
  define: {
    "import.meta.main": JSON.stringify(false),
  }
});
`;
}

function buildVirtualIndexHtml(width: string, height: string) {
  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    html, body { margin: 0; padding: 0; }
    #root { width: ${width}; height: ${height};  }
  </style>
  <script type="module" src="./${ENTRY_FILE_NAME}"></script>
</head>

<body>
  <div id="root"></div>
</body>

</html>
`;
}

export async function startPrevis(options: PrevisOption) {
  const previewType = detectPreviewType(options.previewTargetPath);
  const viteSettings: ViteSettings = options.ignore ? {
    isViteProject: false,
    dir: options.cwd,
    configPath: undefined
  } : await findConfigDirectory(options.cwd) ?? {
    isViteProject: false,
    dir: options.cwd,
    configPath: undefined
  };
  const previewRoot = await initializePreviewProject({
    ...viteSettings,
    width: options.width,
    height: options.height,
    previewType,
    stylePath: options.stylePath,
    volatile: options.volatile,
    forceRewrite: options.force,
  });
  const server = await createServer({
    root: previewRoot.previewDir,
    base: options.cwd,
    configFile: viteSettings.isViteProject ? viteSettings.configPath : undefined,
    clearScreen: false,
    server: { port: options.port },
    plugins: [virtualPreview(previewRoot.previewDir, options.previewTargetPath)],
    cacheDir: join(previewRoot.previewDir, ".vite")
  });
  await wait(100);
  server.listen();
  log(`start http://localhost:${options.port}/`);
  return {
    async ensureBuild() {
      // health check
      while (true) {
        await wait(150);
        const res = await fetch(`http://localhost:${options.port}/`);
        if (res.status === 200) {
          break;
        }
      }
    },
    close() {
      server.close();
      previewRoot.cleanup();
    }
  };
}

export function detectPreviewType(previewTargetPath: string): PreviewType {
  if (previewTargetPath.endsWith(".tsx")) {
    // TODO: detect react/preact/qwik
    return PreviewType.React;
  }
  if (previewTargetPath.endsWith(".svelte")) {
    return PreviewType.Svelte;
  }
  if (previewTargetPath.endsWith(".vue")) {
    return PreviewType.Vue;
  }
  throw new Error("unknown preview type");
}

function buildReactEntry(filename: string, styleRelativePath: string | undefined) {
  return `// generated
${styleRelativePath ? `import '${styleRelativePath}'` : '// no css'}
import { createRoot } from 'react-dom/client';
// @ts-ignore
import * as Target from "/__TARGET__";
const root = document.getElementById('root');

// select entry
const C = Target.__PREVIEW__ ?? Target['${filename}'] ?? Target.default;
createRoot(root).render(<C />);
`;
}

// TODO: Use it later
function buildSvelteEntry(styleRelativePath: string | undefined) {
  return `// generated
${styleRelativePath ? `import '${styleRelativePath}'` : '// no css'}
// @ts-ignore
import Target from "__TARGET__";
new Target({
  target: document.getElementById('root'),
});
`;
}

const log = (...args: Array<unknown>) => {
  console.log("[previs]", ...args);
}

// find vite.config.ts from current dir to root
const VITE_CONFIG_EXTENTIONS = [
  '.ts',
  '.js',
  '.mjs',
  '.mts',
];

type ViteSettings = {
  isViteProject: boolean;
  dir: string;
  configPath?: string;
};

export async function findConfigDirectory(cwd: string): Promise<ViteSettings | undefined> {
  let currentDir = cwd;
  while (currentDir !== "/") {
    for (const ext of VITE_CONFIG_EXTENTIONS) {
      const configPath = join(currentDir, `vite.config${ext}`);
      if (await exists(configPath)) {
        return {
          isViteProject: true,
          dir: currentDir,
          configPath,
        }
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

type InitVitePreviewProjectOption = ViteSettings & {
  width: string;
  height: string;
  stylePath?: string;
  forceRewrite?: boolean;
  volatile?: boolean;
  previewType: PreviewType;
};

export async function initializePreviewProject({
  width,
  height,
  dir,
  configPath,
  volatile,
  stylePath,
  forceRewrite,
  previewType
}: InitVitePreviewProjectOption) {
  const previewDir = join(dir, VIRTUAL_ROOT_DIR);
  // console.log({ previewDir, volatile, ret: Deno.statSync(previewDir) });
  const preExisting = await exists(previewDir, {
    isDirectory: true,
  });
  // console.log({ preExisting, volatile, previewDir });
  if (preExisting && volatile) {
    log(`warning: ${previewDir} is not removed because it already exists.`);
  }
  await Deno.mkdir(previewDir, { recursive: true }).catch(() => { });

  await ensureFile(join(previewDir, 'index.html'), buildVirtualIndexHtml(width, height));

  // generate entry file
  const styleRelativePath = stylePath ? relative(previewDir, stylePath) : undefined;
  if (previewType === PreviewType.React) {
    const filename = basename(stylePath ?? "").split(".")[0];
    await ensureFile(join(previewDir, ENTRY_FILE_NAME), buildReactEntry(filename, styleRelativePath));
  }
  else if (previewType === PreviewType.Svelte) {
    await ensureFile(join(previewDir, ENTRY_FILE_NAME), buildSvelteEntry(styleRelativePath));
  } else {
    throw new Error("not implemented");
  }

  // generate vite.config.mts
  if (configPath) {
    const base = basename(configPath);
    await ensureFile(join(previewDir, 'vite.config.mts'), buildPreviewConfig(base));
  } else {
    await ensureFile(join(previewDir, 'vite.config.mts'), buildVanillaConfig());
  }

  return {
    previewDir,
    cleanup: () => {
      if (!preExisting && volatile) {
        Deno.removeSync(previewDir, { recursive: true });
      }
    }
  }
  async function ensureFile(filepath: string, content: string) {
    if (forceRewrite || !await exists(filepath)) {
      await Deno.writeTextFile(filepath, content);
      // log(`created ${filepath}`);
    }
  }
}

export async function initializeVolatileProject({
  width,
  height,
  dir,
  stylePath,
  forceRewrite,
  previewType
}: InitVitePreviewProjectOption) {
  const tmpHash = Math.random().toString(36).slice(2);
  const previewDir = join(dir, VIRTUAL_ROOT_DIR + "-" + tmpHash);
  await Deno.mkdir(previewDir, { recursive: true }).catch(() => { });

  await ensureFile(join(previewDir, 'index.html'), buildVirtualIndexHtml(width, height));

  // generate entry file
  const styleRelativePath = stylePath ? relative(previewDir, stylePath) : undefined;
  if (previewType === PreviewType.React) {
    const filename = basename(stylePath ?? "").split(".")[0];
    await ensureFile(join(previewDir, ENTRY_FILE_NAME), buildReactEntry(filename, styleRelativePath));
  }
  else if (previewType === PreviewType.Svelte) {
    await ensureFile(join(previewDir, ENTRY_FILE_NAME), buildSvelteEntry(styleRelativePath));
  } else {
    throw new Error("not implemented");
  }

  // generate vite.config.mts
  await ensureFile(join(previewDir, 'vite.config.mts'), buildVanillaConfig());
  return {
    previewDir,
    cleanup: () => {
      Deno.removeSync(previewDir, { recursive: true });
    }
  }
  async function ensureFile(filepath: string, content: string) {
    if (forceRewrite || !await exists(filepath)) {
      await Deno.writeTextFile(filepath, content);
      // log(`created ${filepath}`);
    }
  }
}


function virtualPreview(previewRoot: string, previewTargetPath: string) {
  return {
    name: 'preview',
    enforce: 'pre',
    async load(id) {
      if (id.endsWith(ENTRY_FILE_NAME)) {
        const raw = await Deno.readTextFile(join(previewRoot, ENTRY_FILE_NAME));
        const rel = relative(previewRoot, previewTargetPath);
        const relPath = rel.startsWith(".") ? rel : "./" + rel;
        if (!raw.includes(TARGET_MARKER)) {
          throw new Error("invalid template");
        }
        return raw.replace(TARGET_MARKER, relPath);
      }
    },
  } satisfies Plugin;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
