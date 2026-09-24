#!/usr/bin/env npx tsx
/**
 * Export JSON Schemas for Dart-side reference.
 * Uses zod-to-json-schema (Zod v3 schemas via zod/v3) plus Zod 4 native fallback.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  crosswordDataSchema,
  crosswordEnvelopeSchema,
  matchingDataSchema,
  matchingEnvelopeSchema,
  puzzleEnvelopeSchema,
  chainEnvelopeSchema,
  layoutEnvelopeSchema,
} from '../lib/puzzles/schema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'json-schema');

function exportOne(name: string, schema: z.ZodType, label: string) {
  // Prefer zod-to-json-schema when compatible; otherwise Zod 4 native.
  let json: unknown;
  try {
    json = zodToJsonSchema(schema as never, { name: label, $refStrategy: 'none' });
  } catch {
    json = z.toJSONSchema(schema, { target: 'draft-7' });
  }
  return { name, json };
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const exports = [
    exportOne('puzzle-envelope.schema.json', puzzleEnvelopeSchema, 'PuzzleEnvelope'),
    exportOne('crossword.schema.json', crosswordEnvelopeSchema, 'CrosswordEnvelope'),
    exportOne('crossword-data.schema.json', crosswordDataSchema, 'CrosswordData'),
    exportOne('matching.schema.json', matchingEnvelopeSchema, 'MatchingEnvelope'),
    exportOne('matching-data.schema.json', matchingDataSchema, 'MatchingData'),
    exportOne('chain.schema.json', chainEnvelopeSchema, 'ChainEnvelope'),
    exportOne('layout.schema.json', layoutEnvelopeSchema, 'LayoutEnvelope'),
  ];

  for (const item of exports) {
    await writeFile(path.join(outDir, item.name), `${JSON.stringify(item.json, null, 2)}\n`);
    console.log(`Wrote json-schema/${item.name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
