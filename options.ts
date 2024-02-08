import { parseArgs } from "./deps.ts";
import { AnalyzedEnv } from "./utils.ts";

const argsOptions = {
  help: {
    type: "boolean",
    short: "h",
  },
  model: {
    type: "string",
    short: "m",
  },
  vision: {
    type: "boolean",
  },
  request: {
    type: "string",
    short: "r",
  },
  auto: {
    type: "boolean",
  },
  debug: {
    type: "boolean",
    short: "d",
  },
  scale: {
    type: "string",
  },
  width: {
    type: "string",
    short: "W",
  },
  height: {
    type: "string",
    short: "H",
  },
  queue: {
    type: "string",
    short: "q",
  },
  import: {
    type: 'string',
    short: 'i',
    multiple: true,
  },
  printRaw: {
    type: 'boolean',
    short: 'r',
  },
  noPrint: {
    type: 'boolean',
  },
  port: {
    type: "string",
    short: "p",
  },
  yes: {
    type: "boolean",
    short: 'y'
  },

} as const;

const HELP_INTRO = `usage:
$ previs [options] <target-file>

Examples:
  $ previs doctor                  # check previs can work
  $ previs button.tsx              # start fix existed file
  $ previs button.tsx -i index.css # load with css
`;

export type PrevisOptions = ReturnType<typeof getParsedArgs>['values'] & {
  env: AnalyzedEnv;
  testCommand?: string[];
  getInput: (message: string) => string | undefined;
  getConfirm: (message: string) => boolean;
};

export function getParsedArgs(args: string[]) {
  const splitIndex = args.indexOf("--");
  if (splitIndex === -1) {
    const parsed = parseArgs({
      args: args,
      options: argsOptions,
      allowPositionals: true,
    });
    return {
      ...parsed,
      testCommand: undefined,
    }
  } else {
    return {
      ...parseArgs({
        args: args.slice(0, splitIndex),
        options: argsOptions,
        allowPositionals: true,
      }),
      testCommand: args.slice(splitIndex + 1),
    };
  }
}

export function help() {
  let help = HELP_INTRO + '\n';
  help += "<options>\n";
  const keys = Object.keys(argsOptions);
  for (const key of keys) {
    // @ts-ignore xxx
    const option = argsOptions[key];
    const type = option.type;
    const short = option.short;
    const defaultValue = option.default;
    help += `  ${short ? `-${short}, ` : ''}--${key} <${type}>${defaultValue ? ` (default: ${defaultValue})` : ""}\n`;
  }
  console.log(help);
}

