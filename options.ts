import { parseArgs } from "./deps.ts";
import { AnalyzedEnv } from "./utils.ts";

const argsOptions = {
  help: {
    type: "boolean",
    short: "h",
  },
  vision: {
    type: "boolean",
  },
  request: {
    type: "string",
    short: "r",
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
    short: "w",
  },
  height: {
    type: "string",
    short: "h",
  },
  queue: {
    type: "string",
    short: "q",
  },
  force: {
    type: "boolean",
    short: "f",
    default: false,
  },
  style: {
    type: 'string',
    short: 's',
    multiple: true,
  },
  printRaw: {
    type: 'boolean',
    short: 'r',
  },
  port: {
    type: "string",
    short: "p",
  },
} as const;

const HELP_INTRO = `usage:
$ previs [options] <target-file>

Examples:
  # fix existed file
  $ previs button.tsx

  # fix existed file with css (like tailwindcss)
  $ previs src/button.tsx --style src/image.css

  # generate new file
  $ previs src/button.tsx --input "This is button component"

These are common Previs commands used in various situations:

Doctor: checking environment
  $ previs doctor

Screenshot:
  $ previs ss [options] <target>

Serve:
  $ previs serve [options] <target>
`;

export type PrevisOptions = ReturnType<typeof getParsedArgs>['values'] & {
  env: AnalyzedEnv;
  testCommand?: string[];
  addHook: (fn: () => void) => void;
  exit: (code: number) => void;
  getInput: (message: string) => Promise<string | undefined>;
  getConfirm: (message: string) => Promise<boolean>;
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
  let help = HELP_INTRO;
  const keys = Object.keys(argsOptions);
  for (const key of keys) {
    // @ts-ignore xxx
    const option = options[key];
    const type = option.type;
    const short = option.short;
    const defaultValue = option.default;
    help += `-${short}, --${key} <${type}>${defaultValue ? ` (default: ${defaultValue})` : ""}\n`;
  }
  console.log(help);
}

