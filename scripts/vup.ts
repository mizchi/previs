#!/usr/bin/env -S deno run -A --ext=ts
/*
USAGE:
  deno run -A vup.ts --dry
*/
import { $ } from "https://deno.land/x/dax@0.36.0/mod.ts";
import { parseArgs } from "node:util";
import { parse, increment, format, reverseSort, type ReleaseType } from "https://deno.land/std@0.214.0/semver/mod.ts";
import { join } from "../deps.ts";

const args = parseArgs({
  args: Deno.args,
  options: {
    type: { type: 'string', short: 't', default: 'patch' },
    dry: { type: 'boolean', short: 'd', default: false }
  }
});

const tags = await $`git tag`.lines();

const versions = tags
  .filter((tag: string) => tag.startsWith('v'))
  .map((tag: string) => tag.slice(1))
  .map(parse);
const latest = reverseSort(versions)[0];

if (!latest) {
  console.log('No tags found');
  Deno.exit(1);
}
const releaseType = args.values.type as ReleaseType ?? 'patch';
const newTag = `v${format(increment(latest, releaseType))}`;

if (args.values.dry) {
  console.log('[vup] dryrun', {
    latest: format(latest),
    releaseType,
    newTag
  });
  Deno.exit(0);
}

// update previs version in README.md
const readme = await Deno.readTextFile(join(Deno.cwd(), 'README.md'));
await Deno.writeTextFile(
  join(Deno.cwd(), 'README.md'),
  readme.replace(/x\/previs@.*previs.ts/, `x/previs@${newTag.slice(1)}/previs.ts`)
);
await $`git add README.md`;
await $`git commit -m "chore: update previs version in README.md"`;

await $`git tag ${newTag}`;
await $`git push origin --tags`;

