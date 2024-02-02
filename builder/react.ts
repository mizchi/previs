import { relative } from "../deps.ts";
import { CreateReactProjectOptions } from "./types.ts";

const ENTRY_FILE_NAME = "entry.preview.tsx";

export function buildReactProjectFiles({ width, height, style, previewDir }: CreateReactProjectOptions) {
  const relativeStyles = style.map(s => relative(previewDir, s));
  return {
    'index.html': buildVirtualIndexHtml(width, height),
    'entry.preview.tsx': buildReactEntry('', relativeStyles),
    'vite.config.mts': buildVanillaConfig(),
  };
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

function buildVirtualIndexHtml(width: string | undefined, height: string | undefined) {
  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    html, body { margin: 0; padding: 0; }
    #root {
      width: fit-content;
      height: fit-content;
    }
  </style>
  <script type="module" src="./${ENTRY_FILE_NAME}"></script>
</head>

<body>
  <div id="root"></div>
</body>

</html>
`;
}

function buildReactEntry(filename: string, relativeStyles: string[]) {
  const styleIntro = relativeStyles.map(s => `import '${s}';`).join('\n');
  return `// generated
${styleIntro}
import { createRoot } from 'react-dom/client';
// @ts-ignore
import * as Target from "/__TARGET__";
const root = document.getElementById('root');

// select entry
const Component = Target.__PREVIEW__ ?? Target['${filename}'] ?? Target.default;
createRoot(root).render(<Component />);
`;
};

