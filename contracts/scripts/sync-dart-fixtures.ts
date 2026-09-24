#!/usr/bin/env npx tsx
import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dartFixtures = path.resolve(root, '../mobile_/test/fixtures/contracts');

async function copyTree(src: string, dest: string) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const from = path.join(src, e.name);
    const to = path.join(dest, e.name);
    if (e.isDirectory()) await copyTree(from, to);
    else await cp(from, to);
  }
}

async function main() {
  await copyTree(path.join(root, 'fixtures'), path.join(dartFixtures, 'fixtures'));
  await copyTree(path.join(root, 'json-schema'), path.join(dartFixtures, 'json-schema'));
  await cp(path.join(root, 'MANIFEST.json'), path.join(dartFixtures, 'MANIFEST.json'));
  await writeFile(
    path.join(dartFixtures, 'README.md'),
    `# Vendored puzzle contracts fixtures

Synced from \`contracts/\` via \`npm run sync:dart-fixtures\`.
Do not edit by hand — \`contracts_manifest_test.dart\` checks SHA-256 against MANIFEST.json.
`,
  );
  console.log(`Synced → ${dartFixtures}`);
}

main();
