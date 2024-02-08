import { fix, init, screenshot, test, serve, doctor, help } from "./commands.ts";
import { type ProjectContext } from "./context.ts";
import { type CLIOptions } from "./options.ts";

export const commands: Record<string, (options: CLIOptions, ctx: ProjectContext) => Promise<void>> = {
  help,
  init,
  screenshot,
  fix,
  test,
  serve,
  doctor,
};

export { cleanup } from "./file_utils.ts";
export { buildOptions } from "./options.ts";
export { getProjectContext } from "./context.ts";