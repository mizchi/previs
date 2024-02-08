import { $ } from "../deps.ts";

$.setPrintCommand(true);

const endpoint = Deno.args[0] ?? 'vite-app';

await $`rm -r ${endpoint}`.noThrow().quiet();
await $`npm create vite@latest ${endpoint} -- --template react-ts`;
$.cd(endpoint);
await $`pnpm install`;
await $`pnpm add tailwindcss postcss autoprefixer -D`;
await $`npx tailwindcss init -p`;
await $`echo ".previs*" >> .gitignore`;
// Override
await $`echo "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n" > src/index.css`;
await $`previs doctor`;
