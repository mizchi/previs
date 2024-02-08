import { exists, join, parseArgs } from "../deps.ts";
import { getProjectContext, ProjectContext } from "./context.ts";

const CMDS = [
  "doctor",
  "init",
  "test",
  "screenshot",
  "ss",
  "fix",
  "g",
  "gen",
  "generate",
  "serve",
];

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
  env: ProjectContext;
  testCommand?: string[];
  getInput: (message: string) => string | undefined;
  getConfirm: (message: string) => boolean;
  target: string | undefined;
  command: string;
};

function getParsedArgs(args: string[]) {
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

function getInput(message: string): string | undefined {
  const handler = () => {
    // ignore
  };
  Deno.addSignalListener('SIGINT', handler);
  const ret = prompt(message);
  Deno.removeSignalListener('SIGINT', handler);
  if (ret === null) return undefined;
  return ret;
}

function getConfirm(message: string): boolean {
  const out = prompt(`${message} [y/n]`);
  if (out === null || out.toLowerCase() === 'n') {
    return false;
  }
  return out.toLowerCase() === 'y';
}

export async function buildOptions(cwd: string, args: string[]): Promise<PrevisOptions> {
  const options = getParsedArgs(args);
  const env = await getProjectContext(cwd);

  const first = options.positionals[0];

  let command: string;
  let target: string | undefined = undefined;
  if (CMDS.includes(first)) {
    command = first;
    if (options.positionals[1]) {
      target = join(cwd, options.positionals[1]);
    }
  } else {
    target = join(cwd, first);
    if (await exists(target)) {
      command = "fix";
    } else {
      command = "gen"
    }
  }

  const previsOptions: PrevisOptions = {
    ...options.values,
    testCommand: options.testCommand,
    env,
    getInput,
    getConfirm,
    target: target,
    command,
  };

  return previsOptions;
}
