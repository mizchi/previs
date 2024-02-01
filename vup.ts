import { ReleaseType } from "https://deno.land/std@0.214.0/semver/types.ts";
import { $, parseArgs } from './deps.ts';
import { parse, increment, format } from "https://deno.land/std@0.214.0/semver/mod.ts";

const args = parseArgs({
  args: Deno.args,
  options: {
    type: { type: 'string', alias: 't', default: 'patch' },
  }
});

const v = await $`git describe --tags --abbrev=0`.text();
const parsed = parse(v.slice(1));
// const rv = parse(v);
const releaseType = args.values.type as ReleaseType ?? 'patch';
const newTag = `v${format(increment(parsed, releaseType))}`;

await $`git tag ${newTag}`;
await $`git push origin --tags`;
