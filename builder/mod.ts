import { relative, dirname, join, exists, createServer, Plugin } from '../deps.ts';
import { InitVitePreviewProjectOption, PreviewType, PrevisOption, ViteSettings } from "./types.ts";
import { buildReactProjectFiles } from "./react.ts";

const VIRTUAL_ROOT_DIR = ".previs";
const TARGET_MARKER = "__TARGET__";

const VITE_CONFIG_EXTENTIONS = [
  '.ts',
  '.js',
  '.mjs',
  '.mts',
];

const log = (...args: Array<unknown>) => {
  console.log("[previs]", ...args);
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function startPrevisServer(options: PrevisOption) {
  const defaultConfig: ViteSettings = {
    isViteProject: false,
    dir: options.cwd,
    configPath: undefined
  };
  const viteSettings: ViteSettings = !options.ignore
    ? await findViteProjectDirectory(options.cwd) ?? defaultConfig
    : defaultConfig;
  const previewRoot = await initializeVolatileProject({
    ...viteSettings,
    width: options.width,
    height: options.height,
    stylePath: options.stylePath,
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

export async function findViteProjectDirectory(cwd: string): Promise<ViteSettings | undefined> {
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

export async function initializeVolatileProject({
  width,
  height,
  dir,
  stylePath,
}: InitVitePreviewProjectOption) {
  const tmpHash = Math.random().toString(36).slice(2);
  const previewDir = join(dir, VIRTUAL_ROOT_DIR + "-" + tmpHash);
  await Deno.mkdir(previewDir, { recursive: true }).catch(() => { });

  // now only for react
  const files = buildReactProjectFiles({
    width,
    height,
    stylePath,
    previewDir
  });
  for (const [filename, content] of Object.entries(files)) {
    await Deno.writeTextFile(join(previewDir, filename), content);
  }
  return {
    previewDir,
    cleanup: () => {
      Deno.removeSync(previewDir, { recursive: true });
    }
  }
}

function virtualPreview(previewRoot: string, previewTargetPath: string) {
  return {
    name: 'preview',
    enforce: 'pre',
    async load(id) {
      if (id.endsWith('entry.preview.tsx')) {
        const raw = await Deno.readTextFile(join(previewRoot, 'entry.preview.tsx'));
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
