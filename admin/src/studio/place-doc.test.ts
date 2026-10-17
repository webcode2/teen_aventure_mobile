import { describe, expect, it } from 'vitest';
import { compile } from '@askhub/puzzle-contracts';
import { studioDocFromEnvelope, toPublishDoc, withPlacedCoordinates } from './place-doc';
import type { StudioDoc } from './doc-store';

const week2 = {
  schemaVersion: 1,
  id: 'chain-week-2-v1',
  type: 'CROSSWORD',
  title: 'Week 2 Crossword — Rebekah',
  scripture: 'Genesis 24–28',
  rewards: { points: 40 },
  data: {
    grid: { rows: 7, cols: 9 },
    entries: [
      { id: 'w2a', number: 1, direction: 'down', row: 0, col: 0, answer: 'ISAAC', clue: 'The son', ref: 'Genesis 22:2' },
      { id: 'w2b', number: 2, direction: 'across', row: 2, col: 0, answer: 'ABRAHAM', clue: 'The father', ref: 'Genesis 24:1' },
      { id: 'w2c', number: 3, direction: 'down', row: 2, col: 4, answer: 'HARAN', clue: 'The city', ref: 'Genesis 27:43' },
      { id: 'w2d', number: 4, direction: 'across', row: 6, col: 4, answer: 'NAHOR', clue: 'The brother', ref: 'Genesis 24:15' },
    ],
    links: [
      { fromEntryId: 'w2a', toEntryId: 'w2b', letterIndex: 3 },
      { fromEntryId: 'w2b', toEntryId: 'w2c', letterIndex: 5 },
      { fromEntryId: 'w2c', toEntryId: 'w2d', letterIndex: 5 },
    ],
  },
};

describe('studioDocFromEnvelope', () => {
  it('places every published letter on its saved cell', () => {
    const doc = studioDocFromEnvelope(week2);
    expect(doc).not.toBeNull();
    expect(doc!.id).toBe('chain-week-2-v1');
    expect(doc!.data.steps.map((step) => [step.answer, step.row, step.col, step.fromLetter])).toEqual([
      ['ISAAC', 0, 0, undefined],
      ['ABRAHAM', 2, 0, 3],
      ['HARAN', 2, 4, 5],
      ['NAHOR', 6, 4, 5],
    ]);
  });

  it('fills a chain draft that was saved without canvas coordinates', () => {
    const draft: StudioDoc = {
      schemaVersion: 1,
      id: 'chain-week-2-v1',
      type: 'CHAIN',
      title: 'Week 2 Crossword — Rebekah',
      scripture: 'Genesis 24–28',
      rewards: { points: 40 },
      data: {
        steps: [
          { id: 'w2a', answer: 'ISAAC', direction: 'down', clue: 'The son', ref: 'Genesis 22:2' },
          { id: 'w2b', answer: 'ABRAHAM', direction: 'across', clue: 'The father', ref: 'Genesis 24:1', fromLetter: 3 },
          { id: 'w2c', answer: 'HARAN', direction: 'down', clue: 'The city', ref: 'Genesis 27:43', fromLetter: 5 },
          { id: 'w2d', answer: 'NAHOR', direction: 'across', clue: 'The brother', ref: 'Genesis 24:15', fromLetter: 5 },
        ],
      },
    };
    const placed = withPlacedCoordinates(draft);
    expect(placed.data.steps.map((step) => [step.id, step.row, step.col])).toEqual([
      ['w2a', 0, 0],
      ['w2b', 2, 0],
      ['w2c', 2, 4],
      ['w2d', 6, 4],
    ]);
  });

  it('leaves blank word cards out of the published puzzle', () => {
    const doc = studioDocFromEnvelope(week2)!;
    doc.data.steps.splice(2, 0, {
      id: 'blank',
      answer: '',
      direction: 'across',
      clue: '',
      ref: '',
    });
    const body = toPublishDoc(doc);
    expect(body.type).toBe('LAYOUT');
    if (body.type !== 'LAYOUT') return;
    expect(body.data.entries.map((entry) => entry.answer)).toEqual(['ISAAC', 'ABRAHAM', 'HARAN', 'NAHOR']);
    expect(body.data.links?.some((link) => link.fromEntryId === 'blank' || link.toEntryId === 'blank')).toBe(false);
  });

  it('publishes the same cells it loaded', () => {
    const doc = studioDocFromEnvelope(week2)!;
    const body = toPublishDoc(doc);
    expect(body.type).toBe('LAYOUT');
    const compiled = compile(body);
    expect(compiled.ok).toBe(true);
    if (!compiled.ok) return;
    expect(compiled.canonical.data.entries.map((entry) => [entry.answer, entry.row, entry.col])).toEqual([
      ['ISAAC', 0, 0],
      ['ABRAHAM', 2, 0],
      ['HARAN', 2, 4],
      ['NAHOR', 6, 4],
    ]);
  });
});
