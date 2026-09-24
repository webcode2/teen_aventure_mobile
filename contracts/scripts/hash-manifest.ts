#!/usr/bin/env npx tsx
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function walk(dir: string, base = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(abs, base)));
    else if (e.name.endsWith('.json') || e.name.endsWith('.md')) {
      out.push(path.relative(base, abs).split(path.sep).join('/'));
    }
  }
  return out;
}

async function main() {
  const fixturesRoot = path.join(root, 'fixtures');
  const files = (await walk(fixturesRoot)).filter((f) => f !== 'MANIFEST.json').sort();
  const manifest: {
    version: 1;
    algorithm: 'sha256';
    generatedAt: string;
    files: Record<string, string>;
  } = {
    version: 1,
    algorithm: 'sha256',
    generatedAt: new Date().toISOString(),
    files: {},
  };

  for (const rel of files) {
    const buf = await readFile(path.join(fixturesRoot, rel));
    manifest.files[`fixtures/${rel}`] = createHash('sha256').update(buf).digest('hex');
  }

  // Also hash JSON schemas if present
  try {
    const schemaDir = path.join(root, 'json-schema');
    await stat(schemaDir);
    for (const name of (await readdir(schemaDir)).filter((n) => n.endsWith('.json')).sort()) {
      const buf = await readFile(path.join(schemaDir, name));
      manifest.files[`json-schema/${name}`] = createHash('sha256').update(buf).digest('hex');
    }
  } catch {
    /* optional */
  }

  await writeFile(path.join(root, 'MANIFEST.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`MANIFEST.json: ${Object.keys(manifest.files).length} file(s)`);
}

main();
