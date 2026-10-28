import { describe, expect, it } from 'vitest';
import { parsePastedWords } from './paste-words';
import { initialState, studioReducer } from './doc-store';

describe('pasting puzzle words', () => {
  it('accepts comma/newline lists and ignores blank entries', () => {
    expect(parsePastedWords(' faith, grace,\r\n\nHOPE').words.map((w) => w.answer)).toEqual(['FAITH', 'GRACE', 'HOPE']);
  });
  it('preserves punctuation in clues and scripture from pipes or spreadsheet columns', () => {
    expect(parsePastedWords('FAITH | Trust, even now | Hebrews 11:1\nGRACE\tA gift\tEphesians 2:8').words).toEqual([
      { answer: 'FAITH', clue: 'Trust, even now', ref: 'Hebrews 11:1' },
      { answer: 'GRACE', clue: 'A gift', ref: 'Ephesians 2:8' },
    ]);
  });
  it('reports invalid answers, long words, and extra columns without silently changing them', () => {
    expect(parsePastedWords('HOLY SPIRIT\n123\nABCDEFGHIJKLMNOPQRSTUVWXYZ\nFAITH|clue|ref|extra').errors).toHaveLength(4);
  });
  it('adds a batch in one undo operation without replacing existing words', () => {
    const before = studioReducer(initialState(), { type: 'addStep', step: { id: 'first', answer: 'FAITH', clue: '', ref: '', direction: 'across' } });
    const added = studioReducer(before, { type: 'addSteps', steps: [{ id: 'second', answer: 'GRACE', clue: '', ref: '', direction: 'down' }] });
    expect(added.present.data.steps).toHaveLength(2);
    expect(added.selectedStepId).toBe('second');
    const undone = studioReducer(added, { type: 'undo' });
    expect(undone.present).toEqual(before.present);
    expect(studioReducer(undone, { type: 'redo' }).present).toEqual(added.present);
  });
});
