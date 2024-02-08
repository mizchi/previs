import { basename, dirname, expect, extname, join, prettier } from "./deps.ts";

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

export function getExportedSymbol(filepath: string) {
  const r = getExportSymbolForFilepath(filepath);
  return r.toLowerCase();
}


Deno.test('getExportedComponent', () => {
  expect(getExportedSymbol('/tmp/button.tsx')).toEqual('button');
  expect(getExportedSymbol('/tmp/button-xxx.tsx')).toEqual('buttonxxx');
  expect(getExportedSymbol('/tmp/button.xxx.tsx')).toEqual('button');
  expect(getExportedSymbol('/tmp/Button.tsx')).toEqual('button');
});

export function getExportSymbolForFilepath(filepath: string, firstUpper: boolean | undefined = false) {
  const ext = extname(filepath);
  const base = basename(filepath);
  const names = base.replace(ext, '').split('.')[0].split(/[-_]/g);
  const symbol = names.map((name, wordIdx) => {
    return Array.from(name).map((char, charIdx) => {
      // keep upper case
      if (char.toUpperCase() === char) {
        return char;
      }

      if (wordIdx === 0 && charIdx === 0) {
        if (firstUpper) {
          return char.toUpperCase();
        } else {
          return char.toLowerCase();
        }
      }
      if (charIdx === 0) {
        return char.toUpperCase();
      }
      return char.toLowerCase();
    }).join('');
  }).join('');
  return symbol;
}

Deno.test('getExportSymbolForFilepath', () => {
  expect(getExportSymbolForFilepath('/tmp/button.tsx', true)).toEqual('Button');
  expect(getExportSymbolForFilepath('/tmp/new-button.tsx', true)).toEqual('NewButton');
  expect(getExportSymbolForFilepath('/tmp/new_button.tsx', true)).toEqual('NewButton');

  expect(getExportSymbolForFilepath('/tmp/add.tsx')).toEqual('add');
  expect(getExportSymbolForFilepath('/tmp/myFunc.tsx')).toEqual('myFunc');
  expect(getExportSymbolForFilepath('/tmp/MyFunc.tsx')).toEqual('MyFunc');
  expect(getExportSymbolForFilepath('/tmp/my-func.tsx')).toEqual('myFunc');
  expect(getExportSymbolForFilepath('/tmp/my_func.tsx')).toEqual('myFunc');
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


const HAS_PREVIEW_EXPORTED = /__PREVIEW__/;
const NO_PROPS_COMPNENT_FUNCTION_REGEX = /export default function(\s+\w+)?\s*\(\)/;
const NO_PROPS_COMPNENT_ARROW_FUNCTION_REGEX = /export default \(\)\s?\=\>/;

export function isPreviewableCode(code: string, filepath: string) {
  // check export default component has no props
  const formatted = prettier.format(code, { parser: "typescript" });
  if (HAS_PREVIEW_EXPORTED.test(formatted)) {
    return true;
  }
  if (NO_PROPS_COMPNENT_ARROW_FUNCTION_REGEX.test(formatted)) {
    return true;
  }
  if (NO_PROPS_COMPNENT_FUNCTION_REGEX.test(formatted)) {
    return true;
  }

  const symbol = getExportedSymbol(filepath);

  const FILENAMED_COMPONENT_REGEX = new RegExp(`export const ${symbol} = \\\(\\\) \=\>`, 'i');
  if (FILENAMED_COMPONENT_REGEX.test(formatted)) {
    return true;
  }

  const FILENAMED_FUNCTION_COMPONENT_REGEX = new RegExp(`export function ${symbol}\s?\\\(\\\)`, 'i');
  if (FILENAMED_FUNCTION_COMPONENT_REGEX.test(formatted)) {
    return true;
  }
  return false;
}

Deno.test('isPreviewableCode', () => {
  expect(isPreviewableCode('export const __PREVIEW__ = () => {}', '/tmp/button.tsx')).toBeTruthy();

  expect(isPreviewableCode('export default () => {}', '/tmp/button.tsx')).toBeTruthy();
  expect(isPreviewableCode('export default (props: {}) => {}', '/tmp/button.tsx')).toBeFalsy();

  expect(isPreviewableCode('export default function() {}', '/tmp/button.tsx')).toBeTruthy();
  expect(isPreviewableCode('export default function(props: any) {}', '/tmp/button.tsx')).toBeFalsy();

  expect(isPreviewableCode('export default function App() {}', '/tmp/button.tsx')).toBeTruthy();
  expect(isPreviewableCode('export default function App(props) {}', '/tmp/button.tsx')).toBeFalsy();

  expect(isPreviewableCode('export const Button = () => {}', '/tmp/button.tsx')).toBeTruthy();
  expect(isPreviewableCode('export const Button = (props) => {}', '/tmp/button.tsx')).toBeFalsy();

  expect(isPreviewableCode('export function Button () {}', '/tmp/button.tsx')).toBeTruthy();
  expect(isPreviewableCode('export function Button (props) {}', '/tmp/button.tsx')).toBeFalsy();

});

export function dedent(str: string) {
  const match = str.match(/^[ \t]*(?=\S)/gm);
  if (!match) {
    return str;
  }
  const indent = Math.min(...match.map((x) => x.length));
  const re = new RegExp(`^[ \\t]{${indent}}`, 'gm');
  const result = indent > 0 ? str.replace(re, '') : str;
  return result.replace(/^\n/, '');
}
