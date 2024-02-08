import { $ } from "../deps.ts";

$.cd("examples/with-tailwind");

await $`deno run -A ../../previs.ts button.tsx -i index.css -W 300px`;