import { basename, dirname, expect, extname, join } from "./deps.ts";

export function getTempFilepath(filepath: string) {
  const ext = extname(filepath);
  const base = basename(filepath);
  const newPath = join(dirname(filepath), base.replace(ext, `.__previs__${ext}`));
  return newPath;
}

Deno.test('getTempFilepath', () => {
  expect(getTempFilepath('/tmp/foo/bar.ts')).toEqual('/tmp/foo/bar.__previs__.ts');
  expect(getTempFilepath('/tmp/foo/bar.test.ts')).toEqual('/tmp/foo/bar.test.__previs__.ts');
  expect(getTempFilepath('/tmp/foo/bar_test.ts')).toEqual('/tmp/foo/bar_test.__previs__.ts');
});

export function getExportedComponent(filepath: string) {
  const ext = extname(filepath);
  const base = basename(filepath);
  return base.replace(ext, '').replace(/\-/g, '').split('.')[0].toLowerCase();
}

Deno.test('getExportedComponent', () => {
  expect(getExportedComponent('/tmp/button.tsx')).toEqual('button');
  expect(getExportedComponent('/tmp/button-xxx.tsx')).toEqual('buttonxxx');
  expect(getExportedComponent('/tmp/button.xxx.tsx')).toEqual('button');
  expect(getExportedComponent('/tmp/Button.tsx')).toEqual('button');
});

export function pxToNumber(str: string): number {
  return Number(str.replace('px', ''));
}

export function pick<Data extends object, Keys extends keyof Data>(
  data: Data,
  keys: Keys[]
): Pick<Data, Keys> {
  const result = {} as Pick<Data, Keys>;
  for (const key of keys) {
    result[key] = data[key];
  }

  return result;
}

export function formatFilepath(base: string, filepath: string) {
  if (filepath === base) {
    return './';
  }
  if (filepath.startsWith(base)) {
    return filepath.replace(base + '/', './');
  } else {
    if (filepath.startsWith(Deno.env.get("HOME")!)) {
      return filepath.replace(Deno.env.get("HOME")!, '~');
    }
    return filepath;
  }
}
