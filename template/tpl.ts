function hash(str: string) {
  let hash = 5381;
  let i = str.length;
  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }
  return hash >>> 0;
}

type Tmpl<T extends Record<string, string>> = string & { _types: T };

type TupleToUniqueUnion<T> =
  T extends [infer First, ...infer Rest]
  ? string extends First
  ? TupleToUniqueUnion<Rest>
  : First | TupleToUniqueUnion<Rest>
  : never;

export function tpl<
  In extends string[],
  K extends string = TupleToUniqueUnion<In>,
  P extends string = K extends `@${infer V}` ? V : never,
  Final extends {} = { [k in P]: string }
>(input: TemplateStringsArray, ...params: In): (values: Final) => string {
  const prebuilt = build(input, ...params);
  const fn: any = (values: Final) => {
    return format(prebuilt, values as any);
  }
  return fn;
}

function build<
  In extends string[],
  K extends string = TupleToUniqueUnion<In>,
  P extends string = K extends `@${infer V}` ? V : never
>(input: TemplateStringsArray, ...params: In): Tmpl<{ [k in P]: string }> {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const t = input[i];
    const param = params[i];
    if (param === undefined) {
      continue;
    }
    if (param.startsWith('@')) {
      const insertion = `_@_{${hash(param.slice(1) as string)}}`;
      out += t + insertion;
    } else {
      out += t + param;
    }
  }
  return out as Tmpl<any>;
}

function format<
  T extends Tmpl<Record<string, string>>,
>(
  t: T,
  values: T['_types'],
): string {
  const hashedValues = Object.fromEntries(
    Object.entries(values).map(([k, v]) => [hash(k), v])
  );

  const built = dedent(t);
  const minIndent = getMinIndent(built);
  const indented = (content: string, replacer: string) => {
    const at = built.indexOf(replacer);
    const lastNewline = built.lastIndexOf('\n', at);
    const indentSize = built.slice(lastNewline + 1, at).match(/^[ \t]*/)?.[0]?.length ?? 0;
    return indent(content, Math.max(indentSize - minIndent, 0));
  }

  return built.replaceAll(/\_\@\_{(\d+)}/g, (_matched, hash) => {
    const v = hashedValues[hash];
    return indented(v, `_@_{${hash}}`);
  }).trim();
}

function getMinIndent(str: string) {
  const match = str.match(/^[ \t]*(?=\S)/gm);
  if (!match) {
    return 0;
  }
  return Math.min(...match.map((x) => x.length));
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

// if (import.meta.main) {
//   const n = 1;

//   const template = build`
//   ${'@a'} = ${'@b'} | ${'raw insert value'} n: ${n.toString()}
//     ${'@ml'}
// `;

//   const result = format(template, {
//     a: 'x',
//     b: 'y',
//     ml: 'd\nx',
//   });

//   console.log(result);

//   const t = tpl`${'@a'} = ${'@b'} | ${'raw insert value'} n: ${n.toString()}`;
//   console.log(`template`, tpl`${'@x'}`({ x: 'hello' }), t({ a: 'x', b: 'y' }));
// }

