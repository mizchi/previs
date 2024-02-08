import { $ } from "../deps.ts";
$.setPrintCommand(true);

$.cd("examples/with-tailwind");

await $`deno run -A ../../previs.ts button.tsx -i index.css -W 300px`;