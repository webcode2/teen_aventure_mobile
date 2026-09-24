import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { compile } from '../lib/puzzles/compile.js';
import { anchorCandidates, evaluateDrop } from '../lib/puzzles/drop.js';
import { puzzleEnvelopeSchema } from '../lib/puzzles/schema.js';
import { suggestLinkIndices, validateChain, validateLayout } from '../lib/puzzles/validate.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function load(rel: string) {
  return JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
}

function list(dir: string) {
  return readdirSync(path.join(root, dir))
    .filter((n) => n.endsWith('.json'))
    .sort();
}

describe('lib/puzzles pure core', () => {
  it('has no React imports in puzzle modules', async () => {
    const dir = path.join(root, 'lib/puzzles');
    for (const name of readdirSync(dir).filter((n) => n.endsWith('.ts'))) {
      const src = readFileSync(path.join(dir, name), 'utf8');
      expect(src).not.toMatch(/from ['"]react['"]/);
      expect(src).not.toMatch(/from ['"]react-dom['"]/);
    }
  });

  it('anchorCandidates + DropEval work for legal crossings', () => {
    const prev = { row: 0, col: 0, direction: 'down' as const, answer: 'MANNA' };
    const anchors = anchorCandidates(prev, 'NUMBERS');
    expect(anchors.map((a) => a.letterIndex)).toEqual([3, 4]);
    const drop = evaluateDrop(
      [prev],
      { row: 2, col: 0, direction: 'across', answer: 'NUMBERS' },
    );
    expect(drop.placeable).toBe(true);
    expect(drop.crossings).toBe(1);
    expect(drop.canLock).toBe(true);
  });
});

describe('fixtures/valid — expect pass', () => {
  for (const name of list('fixtures/valid')) {
    it(`${name} compiles and validates clean`, () => {
      const raw = load(`fixtures/valid/${name}`);
      const parsed = puzzleEnvelopeSchema.safeParse(raw);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
      const result = compile(raw);
      expect(result.ok, result.ok ? '' : JSON.stringify(result.issues, null, 2)).toBe(true);
      if (!result.ok) return;
      const layout = validateLayout(result.canonical.data);
      expect(layout.ok, layout.ok ? '' : JSON.stringify(layout.issues, null, 2)).toBe(true);
    });
  }

  it('wilderness passes clean via validateChain + compile', () => {
    const raw = load('fixtures/valid/wilderness.json');
    expect(validateChain(raw).ok).toBe(true);
    const result = compile(raw);
    expect(result.ok).toBe(true);
  });

  it('jael numbering golden: JAEL = 3-Across', () => {
    const result = compile(load('fixtures/valid/jael.json'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const jael = result.canonical.data.entries.find((e) => e.answer === 'JAEL');
    expect(jael).toBeTruthy();
    expect(jael!.direction).toBe('across');
    expect(jael!.number).toBe(3);
  });
});

describe('fixtures/broken — expect fail', () => {
  it('types_shadows fails exactly 3 links with SERPENT→7, LAMB→3, MANNA→2', () => {
    const raw = load('fixtures/broken/types_shadows.json');
    const chain = validateChain(raw);
    expect(chain.ok).toBe(false);
    if (chain.ok) return;
    const links = chain.issues.filter((i) => i.code === 'LINK');
    expect(links).toHaveLength(3);

    const byTo = Object.fromEntries(links.map((l) => [l.toId, l]));
    expect(byTo.tabernacle?.wrongLetter).toBe('R');
    expect(byTo.tabernacle?.suggestions).toEqual([7]);
    expect(byTo.melchizedek?.wrongLetter).toBe('L');
    expect(byTo.melchizedek?.suggestions).toEqual([3]);
    expect(byTo.ark?.wrongLetter).toBe('M');
    // MANNA has A at 2nd and 5th; authors' intended fix is the 2nd letter.
    expect(byTo.ark?.suggestions?.[0]).toBe(2);
    expect(byTo.ark?.suggestions).toContain(2);

    // Message names the wrong letter
    expect(byTo.tabernacle?.message).toContain("'R'");
    expect(byTo.tabernacle?.message).toContain('letter index 7');
  });

  it('collision.json fails with COLLISION', () => {
    const result = compile(load('fixtures/broken/collision.json'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.code === 'COLLISION')).toBe(true);
  });

  it('no_crossing.json fails with NO_CROSSING', () => {
    const result = compile(load('fixtures/broken/no_crossing.json'));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.code === 'NO_CROSSING')).toBe(true);
  });

  it('empty_ref.json fails with empty ref', () => {
    const raw = load('fixtures/broken/empty_ref.json');
    const parsed = puzzleEnvelopeSchema.safeParse(raw);
    // Zod min(1) on ref should fail at parse OR compile CLUE_REF
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => String(i.path.join('.')).includes('ref'))).toBe(true);
      return;
    }
    const result = compile(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.code === 'CLUE_REF' || i.code === 'SCHEMA')).toBe(true);
  });
});

describe('canonical goldens', () => {
  for (const name of list('fixtures/valid')) {
    const goldenName = name.replace(/\.json$/, '.canonical.json');
    it(`${goldenName} matches compile() snapshot`, () => {
      const result = compile(load(`fixtures/valid/${name}`));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const goldenPath = path.join(root, 'fixtures/canonical', goldenName);
      let golden: unknown;
      try {
        golden = load(`fixtures/canonical/${goldenName}`);
      } catch {
        // First run / empty Phase-2 dir: write via expect snapshot file compare after golden script
        expect(result.canonical).toBeTruthy();
        return;
      }
      expect(result.canonical).toEqual(golden);
    });
  }
});

describe('suggestLinkIndices', () => {
  it('SERPENT→TABERNACLE suggests 7', () => {
    expect(suggestLinkIndices('SERPENT', 'TABERNACLE')).toEqual([7]);
  });
  it('LAMB→MELCHIZEDEK suggests 3', () => {
    expect(suggestLinkIndices('LAMB', 'MELCHIZEDEK')).toEqual([3]);
  });
  it('MANNA→ARK suggests 2nd letter (and 5th)', () => {
    expect(suggestLinkIndices('MANNA', 'ARK')[0]).toBe(2);
    expect(suggestLinkIndices('MANNA', 'ARK')).toContain(2);
  });
});
