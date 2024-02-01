#!/usr/bin/env -S deno run -A --ext=ts
import { $, parseArgs } from '../deps.ts';
import { parse, increment, format, type ReleaseType } from "https://deno.land/std@0.214.0/semver/mod.ts";

const args = parseArgs({
  args: Deno.args,
  options: {
    type: { type: 'string', alias: 't', default: 'patch' },
  }
});

const latest = await $`git describe --tags --abbrev=0`.text();
const parsed = parse(latest.slice(1));
const releaseType = args.values.type as ReleaseType ?? 'patch';
const newTag = `v${format(increment(parsed, releaseType))}`;

await $`git tag ${newTag}`;
if (confirm(`Push tag ${newTag}?`)) {
  await $`git push origin --tags`;
}
