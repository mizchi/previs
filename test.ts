import { $ } from './deps.ts';

$.cd('examples/with-vite');
await $`pnpm install`;
await $`deno run -A ../../previs.ts -p 3001 button.tsx`;
