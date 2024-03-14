import { expect, join } from "../deps.ts";
import { getBundledDtsForFile } from "./mod.ts";

const __dirname = new URL(".", import.meta.url).pathname;

const expected = `export declare function read(path: string): Promise<string>;
export declare function write(path: string, content: string): Promise<void>;`

Deno.test("extracts dts for a file #0", async () => {
  const api = await getBundledDtsForFile(join(__dirname, "__fixtures/00_basic/index.ts"));
  expect(api.includes(expected)).toBe(true);
});

Deno.test("extracts dts for a file #1", async () => {
  const api = await getBundledDtsForFile(join(__dirname, "__fixtures/01_noconfig/index.ts"));
  expect(api.includes(expected)).toBe(true);
});
