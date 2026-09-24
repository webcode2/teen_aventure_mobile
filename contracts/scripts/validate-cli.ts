#!/usr/bin/env npx tsx
/**
 * Authors' pre-publish check:
 *   npm run validate -- fixtures/valid --expect-pass
 *   npm run validate -- fixtures/broken --expect-fail
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from '../lib/puzzles/compile.js';
import { puzzleEnvelopeSchema } from '../lib/puzzles/schema.js';
import { validateChain, validateLayout } from '../lib/puzzles/validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

type ExpectMode = 'pass' | 'fail' | 'auto';

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  let expect: ExpectMode = 'auto';
  const paths: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--expect-pass') expect = 'pass';
    else if (a === '--expect-fail') expect = 'fail';
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: npm run validate -- <dir-or-file> [--expect-pass|--expect-fail]`);
      process.exit(0);
    } else paths.push(a);
  }
  if (paths.length === 0) paths.push('fixtures/valid');
  return { expect, paths };
}

async function collectJsonFiles(target: string): Promise<string[]> {
  const abs = path.resolve(root, target);
  const stat = await import('node:fs/promises').then((fs) => fs.stat(abs));
  if (stat.isFile()) return [abs];
  const names = await readdir(abs);
  return names.filter((n) => n.endsWith('.json')).map((n) => path.join(abs, n)).sort();
}

function validateOne(raw: unknown): { ok: boolean; issues: Array<{ code: string; message: string; suggestions?: number[]; toId?: string }> } {
  const parsed = puzzleEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({ code: 'SCHEMA', message: i.message })),
    };
  }
  const doc = parsed.data;
  if (doc.type === 'CHAIN') {
    const chain = validateChain(doc);
    if (!chain.ok) return chain;
    const compiled = compile(doc);
    if (!compiled.ok) return compiled;
    return { ok: true, issues: [] };
  }
  if (doc.type === 'LAYOUT') {
    const compiled = compile(doc);
    if (!compiled.ok) return compiled;
    return { ok: true, issues: [] };
  }
  if (doc.type === 'CROSSWORD') {
    const layout = validateLayout(doc.data);
    if (!layout.ok) return layout;
    return { ok: true, issues: [] };
  }
  return { ok: true, issues: [] };
}

async function main() {
  const { expect, paths } = parseArgs(process.argv);
  let failures = 0;
  let checked = 0;

  for (const p of paths) {
    const files = await collectJsonFiles(p);
    for (const file of files) {
      checked++;
      const rel = path.relative(root, file);
      const raw = JSON.parse(await readFile(file, 'utf8'));
      const result = validateOne(raw);
      const shouldPass = expect === 'pass' || (expect === 'auto' && rel.includes(`${path.sep}valid${path.sep}`));
      const shouldFail = expect === 'fail' || (expect === 'auto' && rel.includes(`${path.sep}broken${path.sep}`));

      if (shouldPass && !result.ok) {
        failures++;
        console.error(`FAIL (expected pass): ${rel}`);
        for (const issue of result.issues) {
          console.error(`  [${issue.code}] ${issue.message}`);
          if (issue.suggestions?.length) console.error(`    suggestions: ${issue.suggestions.join(', ')}`);
        }
      } else if (shouldFail && result.ok) {
        failures++;
        console.error(`FAIL (expected fail): ${rel} passed unexpectedly`);
      } else if (shouldFail && !result.ok) {
        console.log(`OK (failed as expected): ${rel} (${result.issues.length} issue(s))`);
      } else {
        console.log(`OK: ${rel}`);
      }
    }
  }

  console.log(`\nChecked ${checked} file(s); ${failures} failure(s).`);
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
