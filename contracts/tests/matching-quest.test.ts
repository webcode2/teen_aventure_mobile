import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { prepareMatchingPublish } from '../lib/puzzles/matching-publish.js';
import {
  normalizeQuestGameLink,
  questGameAttached,
} from '../lib/puzzles/quest-game.js';
import { matchingEnvelopeSchema } from '../lib/puzzles/schema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function load(rel: string) {
  return JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
}

describe('MATCHING studio doc (forgiveness image sample)', () => {
  const raw = load('fixtures/valid-matching/forgiveness.json');

  it('validates as MATCHING envelope', () => {
    const parsed = matchingEnvelopeSchema.safeParse(raw);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.type).toBe('MATCHING');
    expect(parsed.data.data.leftColumn).toEqual([
      'Sins',
      'Transgressions',
      'Iniquity',
      'Unrighteousness',
    ]);
    expect(parsed.data.data.rightColumn).toEqual([
      'Forgiven',
      'Cleansed',
      'Washed',
      'Blotted',
    ]);
  });

  it('prepareMatchingPublish accepts the sample', () => {
    const prepared = prepareMatchingPublish(raw);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.canonical.id).toBe('match-forgiveness-1');
  });

  it('rejects out-of-range pairs', () => {
    const bad = structuredClone(raw);
    bad.data.correctPairs[0].right = 99;
    const prepared = prepareMatchingPublish(bad);
    expect(prepared.ok).toBe(false);
  });
});

describe('normalizeQuestGameLink', () => {
  it('defaults to PUZZLE and clears matchingId', () => {
    const link = normalizeQuestGameLink({ puzzleId: 'p1' });
    expect(link).toEqual({
      ok: true,
      gameType: 'PUZZLE',
      puzzleId: 'p1',
      matchingId: null,
    });
    expect(questGameAttached(link as Extract<typeof link, { ok: true }>)).toBe(true);
  });

  it('accepts MATCHING with matchingId only', () => {
    const link = normalizeQuestGameLink({
      gameType: 'MATCHING',
      matchingId: 'm1',
      puzzleId: null,
    });
    expect(link).toEqual({
      ok: true,
      gameType: 'MATCHING',
      puzzleId: null,
      matchingId: 'm1',
    });
  });

  it('rejects both ids', () => {
    const link = normalizeQuestGameLink({
      gameType: 'PUZZLE',
      puzzleId: 'p1',
      matchingId: 'm1',
    });
    expect(link.ok).toBe(false);
  });

  it('rejects puzzle id on MATCHING week', () => {
    const link = normalizeQuestGameLink({
      gameType: 'MATCHING',
      puzzleId: 'p1',
    });
    expect(link.ok).toBe(false);
  });

  it('allows draft week with type but no attachment', () => {
    const link = normalizeQuestGameLink({ gameType: 'MATCHING' });
    expect(link).toEqual({
      ok: true,
      gameType: 'MATCHING',
      puzzleId: null,
      matchingId: null,
    });
    if (link.ok) expect(questGameAttached(link)).toBe(false);
  });
});
