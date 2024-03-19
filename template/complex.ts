function hash(str: string) {
  let hash = 5381;
  let i = str.length;
  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }
  return hash >>> 0;
}

type Identity<T> = T extends object ? {} & {
  [P in keyof T]: T[P]
} : T;

type ItemRenderer<T> = {
  kind: 'item',
  (values: T, hashed?: Record<number, any>): string;
};

type WhenRenderer<K extends string, T, U> = {
  kind: 'when',
  key: K;
  _elseType: U;
  (values: T, hashed?: Record<number, any>): string;
  else(values: U, hashed?: Record<number, any>): string;
};


type ListRenderer<K extends string, T> = {
  kind: 'list';
  key: K;
  joiner: string;
  _type: T;
  (values: T, hashed?: Record<number, any>): string;
};

type TupleToUniqueUnion<T> =
  T extends [infer First, ...infer Rest]
  ? First extends (...args: any[]) => any
  ? TupleToUniqueUnion<Rest>
  : string extends First
  ? TupleToUniqueUnion<Rest>
  : First | TupleToUniqueUnion<Rest>
  : never;

type ToSubValues<T> =
  T extends [infer First, ...infer Rest]
  ? First extends ItemRenderer<infer P>
  ? P & ToSubValues<Rest>
  : ToSubValues<Rest>
  : {};

type ToWhenValues<T> =
  T extends [infer First, ...infer Rest]
  ? First extends WhenRenderer<infer K, infer P, infer U>
  ? { [k in K]: boolean } & P & U & ToWhenValues<Rest>
  : ToWhenValues<Rest>
  : {};

type ToListValues<T> =
  T extends [infer First, ...infer Rest]
  ? First extends ListRenderer<infer K, infer P>
  ? { [k in K]: P[] } & ToListValues<Rest>
  : ToListValues<Rest>
  : {};

type RawKey<T extends string> = T extends `${'@' | '!'}${infer R}` ? R : never;

export function each<K extends `${'@' | '!'}${string}`, T>(key: K, tpl: ItemRenderer<T>, joiner?: string): ListRenderer<RawKey<K>, T> {
  const fn: any = (values: T) => {
    return tpl(values);
  }
  fn.kind = 'list';
  fn.key = key.slice(1);
  fn.joiner = joiner ?? '\n';
  return fn;
}

export function when<K extends `${'@' | '!'}${string}`, T, U>(key: K, tpl: ItemRenderer<T>, else_?: ItemRenderer<U>): WhenRenderer<RawKey<K>, T, U> {
  const fn: any = (values: T) => {
    return tpl(values);
  }
  fn.kind = 'when';
  fn.key = key.slice(1);
  fn.else = else_;
  return fn;
}

export function tpl<
  I extends Array<string | ItemRenderer<any> | ListRenderer<any, any> | WhenRenderer<any, any, any>>,
  K extends string = TupleToUniqueUnion<I>,
  P extends string = RawKey<K>,
  Final = Identity<{ [k in P | keyof ToSubValues<I>]: string } & ToListValues<I> & ToWhenValues<I>>
>(input: TemplateStringsArray, ...params: I): ItemRenderer<Final> {
  let built = '';
  const subs: Array<ItemRenderer<any> | ListRenderer<any, any> | WhenRenderer<any, any, any>> = [];
  for (let i = 0; i < input.length; i++) {
    const t = input[i];
    const param = params[i];
    built += t;
    if (param === undefined) {
      continue;
    }
    if (typeof param === 'function') {
      // TODO: sub template
      built += `_fn_{${subs.length}}`;
      subs.push(param);
    } else if (param.startsWith('@') || param.startsWith('!')) {
      const insertion = `_@_{${hash(param.slice(1) as string)}}`;
      built += insertion;
    } else {
      built += param;
    }
  }

  built = dedent(built);
  const minIndent = getMinIndent(built);

  const indented = (content: string, replacer: string) => {
    const at = built.indexOf(replacer);
    const lastNewline = built.lastIndexOf('\n', at);
    const indentSize = built.slice(lastNewline + 1, at).match(/^[ \t]*/)?.[0]?.length ?? 0;
    return indent(content, Math.max(indentSize - minIndent, 0));
  }
  const fn: any = (values: Final) => {
    const hashed = Object.fromEntries(
      Object.entries(values as any).map(([k, v]) => [hash(k), v])
    ) as any;
    return built
      .replaceAll(/_[@\!]_{(\d+)}/g, (matched, hash) => {
        const content = hashed[hash];
        const isRaw = matched.startsWith('_!_');
        if (isRaw) {
          return content;
        }
        return indented(content, matched);
      })
      .replaceAll(/\_fn\_{(\d+)}/g, (matched, fnIdx) => {
        const r = subs[Number(fnIdx)];
        if (r.kind === 'list') {
          const childValues = hashed[hash(r.key)];
          return childValues.map((v: any) => r(v)).map((v: string) => indented(v, matched)).join(r.joiner);
        } else if (r.kind === 'when') {
          const val = hashed[hash(r.key)];
          if (val) {
            const content = r(values, hashed);
            return indented(content, matched);
          } else if (r.else) {
            return r.else(values, hashed);
          } else {
            return ''
          }
        } else {
          const content = r(values, hashed);
          return indented(content, matched);
        }
      })
      .trim();
  };
  fn.kind = 'item';
  return fn;
}

export function dedent(str: string) {
  const matched = str.match(/^[ \t]*(?=\S)/gm);
  if (!matched) {
    return str;
  }
  const indent = Math.min(...matched.map((x) => x.length));
  const re = new RegExp(`^[ \\t]{${indent}}`, 'gm');
  const result = indent > 0 ? str.replaceAll(re, '') : str;
  return result.replaceAll(/^\n/g, '');
}

export function indent(str: string, count: number) {
  if (count === 0) return str;
  const prefix = ' '.repeat(count);
  return str.split('\n').map((x, idx) => {
    if (idx === 0) return x;
    return prefix + x
  }).join('\n');
}

function getMinIndent(str: string) {
  const match = str.match(/^[ \t]*(?=\S)/gm);
  if (!match) {
    return 0;
  }
  return Math.min(...match.map((x) => x.length));
}


// usage: simple

// {
//   const t1 = tpl`
//   ${'@a'} = ${'@b'} | ${'raw'}
//     ${'!ml'}
// `;

//   const result = t1({
//     a: 'x',
//     b: 'y',
//     ml: 'd\nnl',
//   });

//   console.log(result);
// }

// {
//   const template = tpl`
//     ${each('@items', tpl`
//       ${'@key'} = ${'@value'}
//     `)}
//     ${each('@xs', tpl`
//       ${'@v'}
//     `, ' ')}
//     ${'@key'} on top
//     ${when('@flag', tpl`
//       ${'@key'} is active
//     `)}
//     ${when('@flag2',
//     tpl`${'@thenKey'} is active`,
//     tpl`else: ${'@elseKey'}`
//   )}
//   `;

//   const result = template({
//     flag: true,
//     flag2: false,
//     thenKey: 'then',
//     elseKey: 'else',
//     key: 'key0',
//     xs: [{ v: 'x' }, { v: 'y' }],
//     items: [
//       { key: 'x', value: 'y' },
//       { key: 'z', value: 'w' },
//     ]
//   });

//   console.log(result);
// }