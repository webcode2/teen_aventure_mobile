import { describe, expect, it } from 'vitest';
import { chainGhosts, snapToCrossing, placeOnGhost, cascadeReflow } from '../lib/puzzles/snap.js';
import { suggestLinkIndices } from '../lib/puzzles/validate.js';

describe('Types & Shadows ghost regressions (real doc)', () => {
  it('SERPENT→TABERNACLE ghost is the T only', () => {
    const prev = {
      id: 'serpent',
      row: 0,
      col: 0,
      direction: 'across' as const,
      answer: 'SERPENT',
    };
    const ghosts = chainGhosts(prev, 'TABERNACLE');
    expect(ghosts.map((g) => g.letter)).toEqual(['T']);
    expect(ghosts.map((g) => g.letterIndex)).toEqual([7]);
    expect(suggestLinkIndices('SERPENT', 'TABERNACLE')).toEqual([7]);
  });

  it('LAMB→MELCHIZEDEK ghost is the M only', () => {
    const prev = {
      id: 'lamb',
      row: 0,
      col: 0,
      direction: 'across' as const,
      answer: 'LAMB',
    };
    const ghosts = chainGhosts(prev, 'MELCHIZEDEK');
    expect(ghosts.map((g) => g.letter)).toEqual(['M']);
    expect(ghosts.map((g) => g.letterIndex)).toEqual([3]);
  });

  it('MANNA→ARK ghost is the A only', () => {
    const prev = {
      id: 'manna',
      row: 0,
      col: 0,
      direction: 'across' as const,
      answer: 'MANNA',
    };
    const ghosts = chainGhosts(prev, 'ARK');
    // Both A cells are letter A only — never other letters.
    expect(ghosts.every((g) => g.letter === 'A')).toBe(true);
    expect(ghosts.map((g) => g.letterIndex)).toEqual([2, 5]);
    expect(ghosts[0]!.letterIndex).toBe(2);
  });
});

describe('snapToCrossing + placeOnGhost', () => {
  it('snaps dragged ARK onto MANNA A ghost', () => {
    const manna = {
      id: 'manna',
      row: 0,
      col: 0,
      direction: 'down' as const,
      answer: 'MANNA',
    };
    const ghosts = chainGhosts(manna, 'ARK');
    const snap = snapToCrossing(
      [manna],
      { id: 'ark', row: 1, col: 1, direction: 'down', answer: 'ARK' },
      { preferGhosts: ghosts, radius: 3 },
    );
    expect(snap.snapped).toBe(true);
    expect(snap.anchor?.letter).toBe('A');
    expect(snap.eval.canLock).toBe(true);
  });

  it('placeOnGhost locks SERPENT→TABERNACLE on T', () => {
    const serpent = {
      id: 'serpent',
      row: 2,
      col: 0,
      direction: 'across' as const,
      answer: 'SERPENT',
    };
    const ghost = chainGhosts(serpent, 'TABERNACLE')[0]!;
    const result = placeOnGhost(
      [serpent],
      { id: 'tabernacle', row: 0, col: 0, direction: 'down', answer: 'TABERNACLE' },
      ghost,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.placed.row).toBe(ghost.row);
    expect(result.placed.col).toBe(ghost.col);
  });
});

describe('cascadeReflow', () => {
  it('reflows next word onto new anchor after prior move', () => {
    const placed = [
      { id: 'a', row: 0, col: 0, direction: 'down' as const, answer: 'MANNA' },
      { id: 'b', row: 2, col: 0, direction: 'across' as const, answer: 'NUMBERS' },
    ];
    const out = cascadeReflow(
      placed,
      ['a', 'b'],
      [{ fromEntryId: 'a', toEntryId: 'b', letterIndex: 3 }],
      'a',
    );
    const b = out.find((p) => p.id === 'b')!;
    // 3rd letter of MANNA down at (0,0) is row 2 col 0
    expect(b.row).toBe(2);
    expect(b.col).toBe(0);
  });
});
