#!/usr/bin/env -S deno run -A --ext=ts
import { $, join } from '../deps.ts';

const cwd = Deno.cwd();

for await (const example of Deno.readDir(join(cwd, `examples`))) {
  if (example.isDirectory) {
    $.cd(join(cwd, 'examples', example.name));
    console.log(`Checking ${example.name}`);
    await $`pnpm install`.quiet();
    switch (example.name) {
      case "with-vitest": {
        break;
      }
      case 'with-svelte': {
        // TODO
        break;
      }
      case 'with-tailwind': {
        await $`deno run -A ../../previs.ts ss -s index.css button.tsx`;
        break;
      }
      default: {
        await $`pnpm install`;
        await $`deno run -A ../../previs.ts ss button.tsx`;
      }
        break;
    }
  }
}
