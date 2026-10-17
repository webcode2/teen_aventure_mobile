import { matchingEnvelopeSchema, type MatchingEnvelope } from './schema.js';
import type { PuzzleIssue } from './validate.js';

export type PrepareMatchingPublishResult =
  | { ok: true; canonical: MatchingEnvelope }
  | { ok: false; issues: PuzzleIssue[] };

/**
 * Server publish gate for match games: validate MATCHING envelope as-is (no crossword compile).
 */
export function prepareMatchingPublish(raw: unknown): PrepareMatchingPublishResult {
  const parsed = matchingEnvelopeSchema.safeParse(raw);
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

  const data = parsed.data.data;
  const leftLen = data.leftColumn.length;
  const rightLen = data.rightColumn.length;
  const issues: PuzzleIssue[] = [];

  if (leftLen !== rightLen) {
    issues.push({
      code: 'SCHEMA',
      message: 'leftColumn and rightColumn must have the same length',
      path: ['data'],
    });
  }
  if (data.correctPairs.length !== leftLen) {
    issues.push({
      code: 'SCHEMA',
      message: 'correctPairs must cover every left item exactly once',
      path: ['data', 'correctPairs'],
    });
  }

  const lefts = new Set<number>();
  const rights = new Set<number>();
  for (const [i, pair] of data.correctPairs.entries()) {
    if (pair.left < 0 || pair.left >= leftLen) {
      issues.push({
        code: 'SCHEMA',
        message: `correctPairs[${i}].left is out of range`,
        path: ['data', 'correctPairs', i, 'left'],
      });
    }
    if (pair.right < 0 || pair.right >= rightLen) {
      issues.push({
        code: 'SCHEMA',
        message: `correctPairs[${i}].right is out of range`,
        path: ['data', 'correctPairs', i, 'right'],
      });
    }
    if (lefts.has(pair.left)) {
      issues.push({
        code: 'SCHEMA',
        message: `duplicate left index ${pair.left}`,
        path: ['data', 'correctPairs', i, 'left'],
      });
    }
    if (rights.has(pair.right)) {
      issues.push({
        code: 'SCHEMA',
        message: `duplicate right index ${pair.right}`,
        path: ['data', 'correctPairs', i, 'right'],
      });
    }
    lefts.add(pair.left);
    rights.add(pair.right);
  }

  if (issues.length) return { ok: false, issues };
  return { ok: true, canonical: parsed.data };
}
