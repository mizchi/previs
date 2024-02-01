const ENTRY_FILE_NAME = "entry.preview.tsx";

export function buildSvelteConfig() {
  return `// generated
import { defineConfig } from 'npm:vite@5.0.11';
import { svelte } from 'npm:@sveltejs/vite-plugin-svelte@3.0.2';
import preprocess from 'npm:svelte-preprocess@5.1.3';

export default defineConfig({
  define: {
    "import.meta.main": JSON.stringify(false),
  },
  plugins: [
    svelte({
      // @ts-ignore type unmatched
      preprocess: preprocess({}),
    })],
}); 
`;
}

export function buildSvelteEntry(styleRelativePath: string | undefined) {
  return `// generated
${styleRelativePath ? `import '${styleRelativePath}'` : '// no css'}
// @ts-ignore type unmatched
import App from './__TARGET__';
const _app = new App({
  target: document.getElementById('root')!,
});
`
}
export function buildSvelteVirtualIndexHtml(width: string, height: string) {
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
