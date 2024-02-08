import { $ } from "../deps.ts";

export async function multiSelect(message: string, options: Array<{
  text: string;
  selected: boolean;
  value: string;
}>): Promise<Array<string>> {
  const result = await $.multiSelect({
    message,
    options,
    noClear: true,
  });
  return result.map((idx) => options[idx].value);
}

export async function nodePackageInstalled(name: string): Promise<boolean> {
  const out = await $`node -e 'require.resolve("${name}")'`.noThrow().quiet();
  return out.code === 0;
}

// const options = [
//   { text: "export default", selected: false, value: 'export-default' },
//   { text: "In-Source Testing (Vitest)", selected: false, value: 'in-source-test' },
//   { text: "Preview Component", selected: true, value: 'preview-component' },
// ];

// const result = await multiSelect("Include in source code?", options);
// console.log(result);