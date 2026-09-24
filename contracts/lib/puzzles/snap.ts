import { normalizeAnswer, type Direction } from './schema.js';
import {
  anchorCandidates,
  evaluateDrop,
  type AnchorCandidate,
  type DropEval,
} from './drop.js';
import { compile } from './compile.js';
import { cellsFor } from './validate.js';

export type PlacedWord = {
  id: string;
  row: number;
  col: number;
  direction: Direction;
  answer: string;
};

export type GhostAnchor = AnchorCandidate & {
  fromId: string;
  toAnswer: string;
};

export type SnapResult = {
  row: number;
  col: number;
  snapped: boolean;
  eval: DropEval;
  /** When snapped to a chain ghost on a prior word. */
  anchor?: GhostAnchor;
};

/**
 * Chain ghosts for the next word: only cells whose letter equals next[0].
 * Regression (Types & Shadows):
 *   SERPENT → TABERNACLE → T only
 *   LAMB → MELCHIZEDEK → M only
 *   MANNA → ARK → A only
 */
export function chainGhosts(prev: PlacedWord, nextAnswer: string): GhostAnchor[] {
  return anchorCandidates(prev, nextAnswer).map((a) => ({
    ...a,
    fromId: prev.id,
    toAnswer: normalizeAnswer(nextAnswer),
  }));
}

/**
 * Snap a dragged word to the nearest legal crossing / ghost within `radius` cells.
 * Pure — no DOM. Returns original coords if nothing is placeable.
 */
export function snapToCrossing(
  board: PlacedWord[],
  incoming: Omit<PlacedWord, 'id'> & { id?: string },
  opts: {
    preferGhosts?: GhostAnchor[];
    radius?: number;
    gridRows?: number;
    gridCols?: number;
  } = {},
): SnapResult {
  const radius = opts.radius ?? 2;
  const answer = normalizeAnswer(incoming.answer);
  const base = {
    id: incoming.id ?? 'drag',
    direction: incoming.direction,
    answer,
    row: incoming.row,
    col: incoming.col,
  };

  const others = board.filter((w) => w.id !== base.id);

  // 1) Prefer explicit chain ghosts (click-to-anchor / magnetic chain).
  if (opts.preferGhosts?.length) {
    let best: SnapResult | null = null;
    for (const g of opts.preferGhosts) {
      const candidate = { ...base, row: g.row, col: g.col };
      const ev = evaluateDrop(others, candidate, {
        gridRows: opts.gridRows,
        gridCols: opts.gridCols,
      });
      if (!ev.canLock) continue;
      const dist = Math.abs(g.row - incoming.row) + Math.abs(g.col - incoming.col);
      if (!best || dist < Math.abs(best.row - incoming.row) + Math.abs(best.col - incoming.col)) {
        best = { row: g.row, col: g.col, snapped: true, eval: ev, anchor: g };
      }
    }
    if (best) return best;
  }

  // 2) Search neighbourhood for best DropEval (most crossings, then nearest).
  type Cand = { row: number; col: number; ev: DropEval; dist: number };
  const cands: Cand[] = [];
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      const row = incoming.row + dr;
      const col = incoming.col + dc;
      if (row < 0 || col < 0) continue;
      if (opts.gridRows != null && row >= opts.gridRows) continue;
      if (opts.gridCols != null && col >= opts.gridCols) continue;
      const ev = evaluateDrop(others, { ...base, row, col }, {
        gridRows: opts.gridRows,
        gridCols: opts.gridCols,
      });
      if (!ev.canLock) continue;
      cands.push({
        row,
        col,
        ev,
        dist: Math.abs(dr) + Math.abs(dc),
      });
    }
  }

  if (cands.length === 0) {
    const ev = evaluateDrop(others, base, {
      gridRows: opts.gridRows,
      gridCols: opts.gridCols,
    });
    return { row: incoming.row, col: incoming.col, snapped: false, eval: ev };
  }

  cands.sort((a, b) => b.ev.crossings - a.ev.crossings || a.dist - b.dist);
  const top = cands[0]!;
  return {
    row: top.row,
    col: top.col,
    snapped: top.row !== incoming.row || top.col !== incoming.col,
    eval: top.ev,
  };
}

/**
 * After locking / moving `fromId`, cascade-reflow subsequent chain steps via
 * `compile()` geometry (same placement as CHAIN → CROSSWORD), then translate
 * so `fromId` keeps its absolute canvas position.
 * Returns updated placements (ids not in the chain suffix are unchanged).
 */
export function cascadeReflow(
  placed: PlacedWord[],
  chainOrder: string[],
  links: Array<{ fromEntryId: string; toEntryId: string; letterIndex: number }>,
  fromId: string,
): PlacedWord[] {
  const byId = new Map(placed.map((p) => [p.id, { ...p }]));
  const startIdx = chainOrder.indexOf(fromId);
  if (startIdx < 0) return placed;

  const suffix = chainOrder.slice(startIdx);
  if (suffix.length < 2) return placed;

  const origin = byId.get(fromId);
  if (!origin) return placed;

  const steps = suffix.map((id, i) => {
    const w = byId.get(id)!;
    const prevId = i === 0 ? null : suffix[i - 1]!;
    const link =
      prevId == null
        ? undefined
        : links.find((l) => l.fromEntryId === prevId && l.toEntryId === id);
    const letterIndex =
      link?.letterIndex ??
      (prevId ? chainGhosts(byId.get(prevId)!, w.answer)[0]?.letterIndex : undefined);
    return {
      id: w.id,
      answer: normalizeAnswer(w.answer),
      direction: w.direction,
      clue: '.',
      ref: '.',
      ...(i > 0 && letterIndex != null ? { fromLetter: letterIndex } : {}),
    };
  });

  const compiled = compile({
    schemaVersion: 1,
    id: 'cascade-reflow',
    type: 'CHAIN',
    title: 'cascade',
    scripture: 'cascade',
    rewards: {},
    data: { steps },
  });

  if (compiled.ok) {
    const compiledOrigin = compiled.canonical.data.entries.find((e) => e.id === fromId);
    if (compiledOrigin) {
      const dRow = origin.row - compiledOrigin.row;
      const dCol = origin.col - compiledOrigin.col;
      for (const e of compiled.canonical.data.entries) {
        if (!suffix.includes(e.id)) continue;
        const cur = byId.get(e.id);
        if (!cur) continue;
        byId.set(e.id, {
          ...cur,
          row: e.row + dRow,
          col: e.col + dCol,
        });
      }
      return placed.map((p) => byId.get(p.id) ?? p);
    }
  }

  // Fallback: same anchor walk compileChain uses (when layout validate fails).
  for (let i = startIdx; i < chainOrder.length - 1; i++) {
    const curId = chainOrder[i]!;
    const nextId = chainOrder[i + 1]!;
    const cur = byId.get(curId);
    const next = byId.get(nextId);
    if (!cur || !next) break;

    const link = links.find((l) => l.fromEntryId === curId && l.toEntryId === nextId);
    const letterIndex =
      link?.letterIndex ??
      chainGhosts(cur, next.answer)[0]?.letterIndex;
    if (letterIndex == null) break;

    const cells = cellsFor({
      row: cur.row,
      col: cur.col,
      direction: cur.direction,
      answer: normalizeAnswer(cur.answer),
    });
    const anchor = cells[letterIndex - 1];
    if (!anchor) break;

    byId.set(nextId, {
      ...next,
      row: anchor.row,
      col: anchor.col,
    });
  }

  return placed.map((p) => byId.get(p.id) ?? p);
}
/**
 * Click-to-anchor: place `next` on ghost `g` (must be a legal DropEval canLock).
 */
export function placeOnGhost(
  board: PlacedWord[],
  next: PlacedWord,
  ghost: GhostAnchor,
  opts: { gridRows?: number; gridCols?: number } = {},
): { ok: true; placed: PlacedWord; eval: DropEval } | { ok: false; eval: DropEval } {
  const candidate = { ...next, row: ghost.row, col: ghost.col };
  const others = board.filter((w) => w.id !== next.id);
  const ev = evaluateDrop(others, candidate, opts);
  if (!ev.canLock) return { ok: false, eval: ev };
  return { ok: true, placed: candidate, eval: ev };
}
