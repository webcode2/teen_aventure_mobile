#!/usr/bin/env npx tsx
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../lib/puzzles/compile.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function listJson(dir: string): Promise<string[]> {
  const abs = path.join(root, dir);
  const names = await readdir(abs);
  return names.filter((n) => n.endsWith('.json')).sort();
}

async function main() {
  const outDir = path.join(root, 'fixtures/canonical');
  await mkdir(outDir, { recursive: true });

  for (const name of await listJson('fixtures/valid')) {
    const raw = JSON.parse(await readFile(path.join(root, 'fixtures/valid', name), 'utf8'));
    const result = compile(raw);
    if (!result.ok) {
      console.error(`Cannot golden ${name}:`, result.issues);
      process.exit(1);
    }
    const outName = name.replace(/\.json$/, '.canonical.json');
    await writeFile(
      path.join(outDir, outName),
      `${JSON.stringify(result.canonical, null, 2)}\n`,
      'utf8',
    );
    console.log(`Wrote fixtures/canonical/${outName}`);
  }
}

main();
