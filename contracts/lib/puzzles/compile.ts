import {
  chainEnvelopeSchema,
  layoutEnvelopeSchema,
  normalizeAnswer,
  type ChainEnvelope,
  type CrosswordEntry,
  type CrosswordEnvelope,
  type CrosswordLink,
  type Direction,
  type LayoutEnvelope,
  type PuzzleEnvelope,
  type WipEnvelope,
} from './schema.js';
import { cellsFor, validateChain, validateLayout, type PuzzleIssue } from './validate.js';

export type CompileResult =
  | { ok: true; canonical: CrosswordEnvelope }
  | { ok: false; issues: PuzzleIssue[] };

type Placed = {
  id: string;
  direction: Direction;
  row: number;
  col: number;
  answer: string;
  clue: string;
  ref: string;
};

/**
 * Standard crossword numbering: scan cells top→bottom, left→right.
 * A cell gets the next number if it starts an across and/or down entry.
 * Numbering is by position — never authoring order.
 */
export function recomputeNumbers(entries: Placed[]): CrosswordEntry[] {
  const startKeys = new Map<string, Placed[]>();
  for (const e of entries) {
    const key = `${e.row}:${e.col}`;
    const list = startKeys.get(key) ?? [];
    list.push(e);
    startKeys.set(key, list);
  }

  const starts: Array<{ row: number; col: number }> = [];
  for (const key of startKeys.keys()) {
    const [r, c] = key.split(':').map(Number) as [number, number];
    starts.push({ row: r, col: c });
  }
  starts.sort((a, b) => a.row - b.row || a.col - b.col);

  const numberAt = new Map<string, number>();
  let n = 1;
  for (const s of starts) {
    numberAt.set(`${s.row}:${s.col}`, n++);
  }

  return entries.map((e) => ({
    ...e,
    number: numberAt.get(`${e.row}:${e.col}`)!,
  }));
}

function normalizePlaced(placed: Placed[]): { entries: Placed[]; rows: number; cols: number } {
  let minR = Infinity;
  let minC = Infinity;
  let maxR = -Infinity;
  let maxC = -Infinity;
  for (const e of placed) {
    for (const cell of cellsFor(e)) {
      minR = Math.min(minR, cell.row);
      minC = Math.min(minC, cell.col);
      maxR = Math.max(maxR, cell.row);
      maxC = Math.max(maxC, cell.col);
    }
  }
  if (!Number.isFinite(minR)) {
    return { entries: [], rows: 1, cols: 1 };
  }
  const entries = placed.map((e) => ({
    ...e,
    row: e.row - minR,
    col: e.col - minC,
  }));
  return { entries, rows: maxR - minR + 1, cols: maxC - minC + 1 };
}

function compileChain(doc: ChainEnvelope): CompileResult {
  const chainCheck = validateChain(doc);
  // Still attempt geometry so link letter errors and layout errors can both surface;
  // but if chain letter links fail, return those (authoring) first.
  const steps = doc.data.steps;
  const placed: Placed[] = [];
  const links: CrosswordLink[] = [];
  const issues: PuzzleIssue[] = chainCheck.ok ? [] : [...chainCheck.issues];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const answer = normalizeAnswer(step.answer);
    if (i === 0) {
      placed.push({
        id: step.id,
        direction: step.direction,
        row: 0,
        col: 0,
        answer,
        clue: step.clue,
        ref: step.ref,
      });
      continue;
    }

    const prev = placed[i - 1]!;
    const fromLetter = step.fromLetter;
    if (fromLetter == null || fromLetter < 1 || fromLetter > prev.answer.length) {
      // Already reported by validateChain; skip placement.
      placed.push({
        id: step.id,
        direction: step.direction,
        row: prev.row,
        col: prev.col,
        answer,
        clue: step.clue,
        ref: step.ref,
      });
      continue;
    }

    const anchor = cellsFor(prev)[fromLetter - 1]!;
    placed.push({
      id: step.id,
      direction: step.direction,
      row: anchor.row,
      col: anchor.col,
      answer,
      clue: step.clue,
      ref: step.ref,
    });
    links.push({
      fromEntryId: prev.id,
      toEntryId: step.id,
      letterIndex: fromLetter,
    });
  }

  if (issues.some((i) => i.code === 'LINK' || i.code === 'CHAIN' || i.code === 'CLUE_REF')) {
    return { ok: false, issues };
  }

  const { entries, rows, cols } = normalizePlaced(placed);
  const numbered = recomputeNumbers(entries);
  const canonical: CrosswordEnvelope = {
    schemaVersion: 1,
    id: doc.id,
    type: 'CROSSWORD',
    title: doc.title,
    scripture: doc.scripture,
    rewards: doc.rewards,
    data: {
      grid: { rows, cols },
      entries: numbered,
      links,
    },
  };

  const layoutCheck = validateLayout(canonical.data);
  if (!layoutCheck.ok) return { ok: false, issues: layoutCheck.issues };
  return { ok: true, canonical };
}

function compileLayout(doc: LayoutEnvelope): CompileResult {
  const placed: Placed[] = doc.data.entries.map((e) => ({
    id: e.id,
    direction: e.direction,
    row: e.row,
    col: e.col,
    answer: normalizeAnswer(e.answer),
    clue: e.clue,
    ref: e.ref,
  }));

  for (const e of placed) {
    if (!e.clue.trim() || !e.ref.trim()) {
      return {
        ok: false,
        issues: [
          {
            code: 'CLUE_REF',
            message: `Entry ${e.id}: clue and ref must be non-empty`,
          },
        ],
      };
    }
  }

  const { entries, rows, cols } = normalizePlaced(placed);
  const numbered = recomputeNumbers(entries);
  const canonical: CrosswordEnvelope = {
    schemaVersion: 1,
    id: doc.id,
    type: 'CROSSWORD',
    title: doc.title,
    scripture: doc.scripture,
    rewards: doc.rewards,
    data: {
      grid: {
        rows: doc.data.grid?.rows ?? rows,
        cols: doc.data.grid?.cols ?? cols,
      },
      entries: numbered,
      links: doc.data.links,
    },
  };

  // If author supplied explicit grid larger than content, keep it; shrink if too small.
  let maxR = 0;
  let maxC = 0;
  for (const e of numbered) {
    for (const c of cellsFor(e)) {
      maxR = Math.max(maxR, c.row);
      maxC = Math.max(maxC, c.col);
    }
  }
  canonical.data.grid.rows = Math.max(canonical.data.grid.rows, maxR + 1);
  canonical.data.grid.cols = Math.max(canonical.data.grid.cols, maxC + 1);

  const layoutCheck = validateLayout(canonical.data);
  if (!layoutCheck.ok) return { ok: false, issues: layoutCheck.issues };
  return { ok: true, canonical };
}

/**
 * Compile WIP (CHAIN | LAYOUT) → canonical CROSSWORD.
 * Chain docs resolve to absolute coordinates; numbering is recomputed by position.
 */
export function compile(input: unknown): CompileResult {
  const asChain = chainEnvelopeSchema.safeParse(input);
  if (asChain.success) return compileChain(asChain.data);

  const asLayout = layoutEnvelopeSchema.safeParse(input);
  if (asLayout.success) return compileLayout(asLayout.data);

  if (asChain.error) {
    return {
      ok: false,
      issues: asChain.error.issues.map((issue) => ({
        code: 'SCHEMA' as const,
        message: issue.message,
        path: issue.path.filter((p): p is string | number => typeof p === 'string' || typeof p === 'number'),
      })),
    };
  }

  return {
    ok: false,
    issues: [{ code: 'SCHEMA', message: 'Input is not a CHAIN or LAYOUT WIP document' }],
  };
}

/** Compile if WIP; if already CROSSWORD, re-number and re-validate. */
export function toCanonical(input: unknown): CompileResult {
  const compiled = compile(input);
  if (compiled.ok || (input && typeof input === 'object' && (input as { type?: string }).type !== 'CROSSWORD')) {
    return compiled;
  }

  const doc = input as CrosswordEnvelope;
  const placed: Placed[] = doc.data.entries.map((e) => ({
    id: e.id,
    direction: e.direction,
    row: e.row,
    col: e.col,
    answer: normalizeAnswer(e.answer),
    clue: e.clue,
    ref: e.ref,
  }));
  const numbered = recomputeNumbers(placed);
  const canonical: CrosswordEnvelope = {
    ...doc,
    type: 'CROSSWORD',
    data: { ...doc.data, entries: numbered },
  };
  const layoutCheck = validateLayout(canonical.data);
  if (!layoutCheck.ok) return { ok: false, issues: layoutCheck.issues };
  return { ok: true, canonical };
}

export function isWip(input: PuzzleEnvelope): input is WipEnvelope {
  return input.type === 'CHAIN' || input.type === 'LAYOUT';
}
