import { describe, expect, it } from 'vitest';
import { normalizeQuestGameLink, questGameStepLabel, weekGameReady } from './quest-game';

describe('quest game view helpers', () => {
  it('labels the editor step from gameType', () => {
    expect(questGameStepLabel('PUZZLE')).toBe('Puzzle');
    expect(questGameStepLabel('MATCHING')).toBe('Match');
  });

  it('weekGameReady uses puzzle title for PUZZLE weeks', () => {
    const ready = weekGameReady({
      gameType: 'PUZZLE',
      puzzleId: 'p1',
      puzzleTitle: 'Jael',
      matchingId: null,
    });
    expect(ready).toEqual({ label: 'Puzzle', title: 'Jael', ready: true });
  });

  it('weekGameReady uses match title for MATCHING weeks', () => {
    const ready = weekGameReady({
      gameType: 'MATCHING',
      matchingId: 'm1',
      matchingTitle: 'Forgiven and Cleansed',
      puzzleId: null,
    });
    expect(ready).toEqual({ label: 'Match', title: 'Forgiven and Cleansed', ready: true });
  });

  it('weekGameReady is false when the chosen game is missing', () => {
    expect(
      weekGameReady({ gameType: 'MATCHING', matchingId: null, matchingTitle: '' }).ready,
    ).toBe(false);
  });

  it('normalizeQuestGameLink clears the unused id for the picker', () => {
    const link = normalizeQuestGameLink({
      gameType: 'MATCHING',
      matchingId: 'm1',
      puzzleId: null,
    });
    expect(link).toMatchObject({ ok: true, gameType: 'MATCHING', matchingId: 'm1', puzzleId: null });
  });
});
