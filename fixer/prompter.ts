type Message = {
  role: 'system' | 'user' | 'assistant',
  content: string,
}

export type NewInput = {
  request: string,
  filename: string,
}

export interface FixInput extends NewInput {
  code: string,
}

type Prompter<Context> = {
  ['new']: {
    build(input: NewInput, flags: string[]): Message[];
    selectors(input: NewInput, ctx: Context): FlagSelector<string>[];
  },
  fix: {
    build(input: FixInput, flags: string[]): Message[];
    selectors(input: FixInput, ctx: Context): FlagSelector<string>[];
  }
  // getNewFlagSelectors(input: NewInput, ctx: Context, flags: string[]): FlagSelector<string>[];
  // getFixFlagSelectors(input: FixInput, ctx: Context, flags: string[]): FlagSelector<string>[];
}

type TextGenerator<Context, Input, Flag extends string> = string | ((input: Input, ctx: Context, flags: string[]) => string);
type TextListGenerator<Context, Input, Flag extends string> = string[] | ((input: Input, ctx: Context, flags: string[]) => string[]);

type SystemTemplate = (values: {
  intro: string,
  rules: string[],
  example: string,
}) => string;

type UserTemplate = (values: { request: string, outro: string | undefined }) => string;

type FlagSelector<Flag extends string> = {
  text: string;
  selected: boolean;
  value: Flag;
};

type GetFlagSelectors<Context, Input, Flag extends string> = (input: Input, ctx: Context, flags: Flag[]) => FlagSelector<Flag>[];

type TemplateSource<Context, Input, Flag extends string = string> = {
  flags: Flag[],
  flagSelectors?: FlagSelector<Flag>[] | GetFlagSelectors<Context, Input, Flag>,
  intro: TextGenerator<Context, Input, Flag>,
  rules: TextListGenerator<Context, Input, Flag>,
  example: TextGenerator<Context, Input, Flag>,
  system?: SystemTemplate,
  request: TextGenerator<Context, Input, Flag>,
  outro?: TextGenerator<Context, Input, Flag>,
  user?: UserTemplate,
}

export type PromptAction<Input, Flag extends string> = {
  build: (input: Input, flags: Flag[]) => Message[],
  selectors: (input: Input) => FlagSelector<Flag>[],
}

export function buildTemplateToAction<Context, Input, Flag extends string>(context: Context, template: TemplateSource<Context, Input, Flag>): PromptAction<Input, Flag> {
  const defaultSystemTemplate: SystemTemplate = (values) => {
    return `${values.intro}

## Rules

${values.rules.map(s => `- ${s}`).join('\n')}

## Output Example

${values.example}`.trim();
  };
  const defaultUserTemplate: UserTemplate = (values) => {
    let out = values.request;
    if (values.outro) {
      out += '\n\n---\n\n' + values.outro;
    }
    return out;
  }

  const defaultGetFlagSelectors: GetFlagSelectors<Context, Input, Flag> = (_input, _ctx, flags) => {
    return flags.map(flag => ({ text: flag, selected: false, value: flag }));
  }

  return {
    build(input, flags) {
      return buildMessages(template, input, flags);
    },
    selectors(input): FlagSelector<Flag>[] {
      if (template.flagSelectors === undefined) {
        return defaultGetFlagSelectors(input, context, template.flags);
      }
      if (Array.isArray(template.flagSelectors)) {
        return template.flags.map(flag => ({ text: flag, selected: false, value: flag }));
      }
      return template.flagSelectors(input, context, template.flags);
    }
  }

  function buildMessages(
    template: TemplateSource<Context, Input, Flag>,
    input: Input,
    flags: Flag[]
  ): Message[] {
    const intro = resolve(template.intro, input, context, flags);
    const rules = resolve(template.rules, input, context, flags);
    const example = resolve(template.example, input, context, flags);

    const system = (template.system ?? defaultSystemTemplate)({ intro, rules, example });

    const request = resolve(template.request, input, context, flags);
    const outro = resolve(template.outro, input, context, flags);

    const user = (template.user ?? defaultUserTemplate)({ request, outro });

    return [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]
  }
  function resolve<I, R>(
    value: R | ((input: I, ctx: Context, flags: string[]) => R),
    input: I,
    ctx: Context,
    flags: string[]
  ): R {
    // @ts-ignore xxx
    return typeof value === 'function' ? value(input, ctx, flags) : value;
  }
}


export function buildPrompter<Context>(context: Context, templates: {
  new: TemplateSource<Context, NewInput>,
  fix: TemplateSource<Context, FixInput>,
}): Prompter<Context> {
  return {
    new: buildTemplateToAction(context, templates.new),
    fix: buildTemplateToAction(context, templates.fix),
  };

}

