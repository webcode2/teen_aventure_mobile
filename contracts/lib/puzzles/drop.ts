import { normalizeAnswer, type Direction } from './schema.js';
import { cellsFor } from './validate.js';

export type AnchorCandidate = {
  /** 1-based letter index on `prev` where `next` can start. */
  letterIndex: number;
  row: number;
  col: number;
  letter: string;
};

export type DropEval = {
  crossings: number;
  conflicts: number;
  placeable: boolean;
  canLock: boolean;
  conflictCells: Array<{ row: number; col: number; existing: string; incoming: string }>;
};

type PlacedWord = {
  row: number;
  col: number;
  direction: Direction;
  answer: string;
};

/**
 * Letters on `prev` where `next` can begin (letter equals next[0]).
 * Used by Studio drag/drop to offer legal anchors.
 */
export function anchorCandidates(
  prev: PlacedWord,
  nextAnswer: string,
): AnchorCandidate[] {
  const prevAnswer = normalizeAnswer(prev.answer);
  const next = normalizeAnswer(nextAnswer);
  if (!next) return [];
  const need = next[0]!;
  const out: AnchorCandidate[] = [];
  const cells = cellsFor({ ...prev, answer: prevAnswer });
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]!.letter === need) {
      out.push({
        letterIndex: i + 1,
        row: cells[i]!.row,
        col: cells[i]!.col,
        letter: need,
      });
    }
  }
  return out;
}

function buildOccupancy(words: PlacedWord[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const w of words) {
    for (const cell of cellsFor({ ...w, answer: normalizeAnswer(w.answer) })) {
      map.set(`${cell.row}:${cell.col}`, cell.letter);
    }
  }
  return map;
}

/**
 * Evaluate dropping `incoming` onto an existing board.
 * - crossings: cells that match an existing letter
 * - conflicts: cells that disagree with an existing letter
 * - placeable: no conflicts
 * - canLock: placeable and (crossings > 0 OR board empty)
 */
export function evaluateDrop(
  board: PlacedWord[],
  incoming: PlacedWord,
  opts: { gridRows?: number; gridCols?: number } = {},
): DropEval {
  const answer = normalizeAnswer(incoming.answer);
  const cells = cellsFor({ ...incoming, answer });
  const occ = buildOccupancy(board);
  let crossings = 0;
  let conflicts = 0;
  const conflictCells: DropEval['conflictCells'] = [];

  for (const cell of cells) {
    if (opts.gridRows != null && (cell.row < 0 || cell.row >= opts.gridRows)) {
      return {
        crossings: 0,
        conflicts: cells.length,
        placeable: false,
        canLock: false,
        conflictCells: [{ row: cell.row, col: cell.col, existing: '', incoming: cell.letter }],
      };
    }
    if (opts.gridCols != null && (cell.col < 0 || cell.col >= opts.gridCols)) {
      return {
        crossings: 0,
        conflicts: cells.length,
        placeable: false,
        canLock: false,
        conflictCells: [{ row: cell.row, col: cell.col, existing: '', incoming: cell.letter }],
      };
    }

    const key = `${cell.row}:${cell.col}`;
    const existing = occ.get(key);
    if (existing == null) continue;
    if (existing === cell.letter) crossings++;
    else {
      conflicts++;
      conflictCells.push({
        row: cell.row,
        col: cell.col,
        existing,
        incoming: cell.letter,
      });
    }
  }

  const placeable = conflicts === 0;
  const canLock = placeable && (board.length === 0 || crossings > 0);

  return { crossings, conflicts, placeable, canLock, conflictCells };
}

/** Alias matching the Studio API name. */
export type DropEvalResult = DropEval;
export const DropEval = evaluateDrop;
