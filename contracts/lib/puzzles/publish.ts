import { toCanonical } from './compile.js';
import { crosswordEnvelopeSchema, type CrosswordEnvelope } from './schema.js';
import type { PuzzleIssue } from './validate.js';

export type PreparePublishResult =
  | { ok: true; canonical: CrosswordEnvelope }
  | { ok: false; issues: PuzzleIssue[] };

/**
 * Server publish gate: re-validate from scratch → compile → canonical.parse.
 * Does not touch the database. Callers insert append-only staged rows only on ok.
 */
export function prepareStagedPublish(raw: unknown): PreparePublishResult {
  const compiled = toCanonical(raw);
  if (!compiled.ok) return { ok: false, issues: compiled.issues };

  const parsed = crosswordEnvelopeSchema.safeParse(compiled.canonical);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        code: 'SCHEMA' as const,
        message: issue.message,
        path: issue.path.filter(
          (p): p is string | number => typeof p === 'string' || typeof p === 'number',
        ),
      })),
    };
  }

  return { ok: true, canonical: parsed.data };
}
