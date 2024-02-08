import { join, parseArgs } from "../deps.ts";

const CMDS = [
  "help",
  "doctor",
  "init",
  "test",
  "screenshot",
  "ss",
  "fix",
  "serve",
];

const argsOptions = {
  help: {
    type: "boolean",
    short: "h",
  },
  printPrompt: {
    type: "boolean",
  },
  noAutoload: {
    type: 'boolean',
  },
  model: {
    type: "string",
    short: "m",
    description: "OpenAI API model",
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
  $ previs button.tsx # start fix existed file
  $ previs button.tsx -i index.css # load with css
`;

// function getParsedArgs(args: string[]) {
//   const splitIndex = args.indexOf("--");
//   if (splitIndex === -1) {
//     const parsed = parseArgs({
//       args: args,
//       options: argsOptions,
//       allowPositionals: true,
//     });
//     return {
//       ...parsed,
//       testCommand: undefined,
//     }
//   } else {
//     return {
//       ...parseArgs({
//         args: args.slice(0, splitIndex),
//         options: argsOptions,
//         allowPositionals: true,
//       }),
//       testCommand: args.slice(splitIndex + 1),
//     };
//   }
// }

export function getHelpText() {
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
  return help;
}

export type CLIOptions = Awaited<ReturnType<typeof buildOptions>>;

export function buildOptions(cwd: string, args: string[]) {
  const splitIndex = args.indexOf("--");
  const previsArgs = args.slice(0, splitIndex === -1 ? args.length : splitIndex);
  const testCmd = splitIndex === -1 ? undefined : args.slice(splitIndex + 1);

  const parsed = parseArgs({
    args: previsArgs,
    options: argsOptions,
    allowPositionals: true,
  });
  const first = parsed.positionals[0];

  // define command
  let command: string;
  let target: string | undefined = undefined;
  if (first == null || parsed.values.help) {
    command = "help";
  } else if (CMDS.includes(first)) {
    command = first;
    if (parsed.positionals[1]) {
      target = join(cwd, parsed.positionals[1]);
    }
  } else {
    target = join(cwd, first);
    command = "fix";
  }

  return {
    ...parsed.values,
    testCmd: testCmd,
    target: target,
    command,
  };
}
