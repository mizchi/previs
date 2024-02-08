import { relative, join, exists, createServer, Plugin } from '../deps.ts';
import { InitVitePreviewProjectOption, PreviewType, ViteSettings } from "./types.ts";
import { buildReactProjectFiles } from "./react.ts";

const PREVIS_ROOT = ".previs";
const TARGET_MARKER = "__TARGET__";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type BuilderOption = {
  cwd: string;
  target: string;
  port: number;
  imports: string[];
};

export async function startBuilder(options: BuilderOption) {
  const settings = await findProjectSettings(options.cwd);
  await initializeProject({
    ...settings,
    imports: options.imports,
  }, options.target);
  const server = await createServer({
    root: settings.virtualRoot,
    base: options.cwd,
    logLevel: "silent",
    configFile: settings.preExists ? settings.configPath : undefined,
    clearScreen: false,
    server: { port: options.port },
    plugins: [virtualPreview(settings.virtualRoot, options.target)],
    cacheDir: join(settings.virtualRoot, ".vite")
  });
  server.listen();
  console.log(`[previs:server] http://localhost:${options.port}/`);
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
    async dispose() {
      server.close();
    }
  };

  // vite plugin
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
}

// TODO
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

async function findProjectSettings(cwd: string): Promise<ViteSettings> {
  // check default .previs
  if (await exists(join(cwd, PREVIS_ROOT))) {
    return {
      preExists: true,
      viteBase: cwd,
      configPath: join(cwd, "vite.config.mts"),
      virtualRoot: join(cwd, PREVIS_ROOT)
    }
  };
  // create temporal .previs-[hash]
  const tmpHash = Math.random().toString(36).slice(2);
  const previewDir = join(cwd, PREVIS_ROOT + "-" + tmpHash);
  return {
    preExists: false,
    viteBase: cwd,
    configPath: undefined,
    virtualRoot: previewDir
  };
}

export async function initializeProject(
  {
    imports,
    virtualRoot,
  }: InitVitePreviewProjectOption,
  filename?: string
) {
  await Deno.mkdir(virtualRoot, { recursive: true }).catch(() => { });
  const files = buildReactProjectFiles({
    imports,
    filename: filename ?? "index.tsx",
    previewDir: virtualRoot,
  });
  for (const [filename, content] of Object.entries(files)) {
    await Deno.writeTextFile(join(virtualRoot, filename), content);
  }
}

