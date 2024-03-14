import { readFile, writeFile } from 'node:fs/promises';
export async function read(path: string) {
  return await readFile(path, 'utf8');
}

export async function write(path: string, content: string) {
  return await writeFile(path, content, 'utf8');
}