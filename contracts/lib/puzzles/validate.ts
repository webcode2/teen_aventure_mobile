import {
  normalizeAnswer,
  type ChainEnvelope,
  type ChainStep,
  type CrosswordData,
  type CrosswordEntry,
  type CrosswordLink,
  type Direction,
  type LayoutEnvelope,
} from './schema.js';

export type Cell = { row: number; col: number; letter: string };

export type PuzzleIssue = {
  code: 'SCHEMA' | 'BOUNDS' | 'COLLISION' | 'NO_CROSSING' | 'LINK' | 'CLUE_REF' | 'CHAIN';
  message: string;
  path?: Array<string | number>;
  /** Named wrong letter when a link fails. */
  wrongLetter?: string;
  /** 1-based indices that would correctly start the next answer. */
  suggestions?: number[];
  fromId?: string;
  toId?: string;
  fromAnswer?: string;
  toAnswer?: string;
  letterIndex?: number;
};

export type IssueResult = { ok: true } | { ok: false; issues: PuzzleIssue[] };

export function cellsFor(entry: {
  row: number;
  col: number;
  direction: Direction;
  answer: string;
}): Cell[] {
  const answer = normalizeAnswer(entry.answer);
  const cells: Cell[] = [];
  for (let i = 0; i < answer.length; i++) {
    cells.push({
      row: entry.direction === 'down' ? entry.row + i : entry.row,
      col: entry.direction === 'across' ? entry.col + i : entry.col,
      letter: answer[i]!,
    });
  }
  return cells;
}

/** 1-based indices in `from` whose letter equals the first letter of `to`. */
export function suggestLinkIndices(fromAnswer: string, toAnswer: string): number[] {
  const from = normalizeAnswer(fromAnswer);
  const to = normalizeAnswer(toAnswer);
  if (!to) return [];
  const target = to[0]!;
  const out: number[] = [];
  for (let i = 0; i < from.length; i++) {
    if (from[i] === target) out.push(i + 1);
  }
  return out;
}

function formatSuggestions(suggestions: number[]): string {
  if (suggestions.length === 0) return 'no matching letter exists';
  if (suggestions.length === 1) return `use letter index ${suggestions[0]}`;
  return `use one of letter indices ${suggestions.join(', ')}`;
}

/**
 * Validate connective chain links on WIP CHAIN docs.
 * Error messages NAME the wrong letter and suggest the correct index.
 */
export function validateChain(doc: ChainEnvelope): IssueResult {
  const issues: PuzzleIssue[] = [];
  const steps = doc.data.steps;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const answer = normalizeAnswer(step.answer);
    if (!step.clue.trim()) {
      issues.push({ code: 'CLUE_REF', message: `Step ${step.id}: clue is empty`, path: ['data', 'steps', i, 'clue'] });
    }
    if (!step.ref.trim()) {
      issues.push({ code: 'CLUE_REF', message: `Step ${step.id}: ref is empty`, path: ['data', 'steps', i, 'ref'] });
    }
    if (answer.length === 0) {
      issues.push({ code: 'CHAIN', message: `Step ${step.id}: answer has no letters`, path: ['data', 'steps', i, 'answer'] });
    }

    if (i === 0) {
      if (step.fromLetter != null) {
        issues.push({
          code: 'CHAIN',
          message: `Step ${step.id}: first step must not set fromLetter`,
          path: ['data', 'steps', i, 'fromLetter'],
        });
      }
      continue;
    }

    const prev = steps[i - 1]!;
    const prevAnswer = normalizeAnswer(prev.answer);
    if (step.fromLetter == null) {
      issues.push({
        code: 'LINK',
        message: `Step ${step.id}: missing fromLetter link from ${prev.id}`,
        fromId: prev.id,
        toId: step.id,
        suggestions: suggestLinkIndices(prevAnswer, answer),
      });
      continue;
    }

    const linkIssue = checkLetterLink(prev, step, step.fromLetter);
    if (linkIssue) issues.push(linkIssue);
  }

  return issues.length ? { ok: false, issues } : { ok: true };
}

export function checkLetterLink(
  from: Pick<ChainStep, 'id' | 'answer'>,
  to: Pick<ChainStep, 'id' | 'answer'>,
  letterIndex: number,
): PuzzleIssue | null {
  const fromAnswer = normalizeAnswer(from.answer);
  const toAnswer = normalizeAnswer(to.answer);
  const suggestions = suggestLinkIndices(fromAnswer, toAnswer);

  if (letterIndex < 1 || letterIndex > fromAnswer.length) {
    return {
      code: 'LINK',
      message: `Link ${from.id}→${to.id}: letter index ${letterIndex} is out of range for ${fromAnswer} (len ${fromAnswer.length}); ${formatSuggestions(suggestions)}`,
      fromId: from.id,
      toId: to.id,
      fromAnswer,
      toAnswer,
      letterIndex,
      suggestions,
    };
  }

  const wrongLetter = fromAnswer[letterIndex - 1]!;
  const need = toAnswer[0]!;
  if (wrongLetter !== need) {
    return {
      code: 'LINK',
      message: `Link ${from.id}→${to.id}: index ${letterIndex} is '${wrongLetter}' but ${toAnswer} starts with '${need}'; ${formatSuggestions(suggestions)}`,
      wrongLetter,
      fromId: from.id,
      toId: to.id,
      fromAnswer,
      toAnswer,
      letterIndex,
      suggestions,
    };
  }

  return null;
}

/**
 * Validate a placed crossword layout: bounds, collisions, real-crossing rule,
 * non-empty clue/ref. Also validates optional explicit links on the grid.
 */
export function validateLayout(
  data: CrosswordData,
  opts: { requireCrossing?: boolean } = {},
): IssueResult {
  const requireCrossing = opts.requireCrossing ?? data.entries.length >= 2;
  const issues: PuzzleIssue[] = [];

  for (const entry of data.entries) {
    if (!entry.clue.trim()) {
      issues.push({ code: 'CLUE_REF', message: `Entry ${entry.id}: clue is empty` });
    }
    if (!entry.ref.trim()) {
      issues.push({ code: 'CLUE_REF', message: `Entry ${entry.id}: ref is empty` });
    }
    for (const cell of cellsFor(entry)) {
      if (cell.row < 0 || cell.col < 0 || cell.row >= data.grid.rows || cell.col >= data.grid.cols) {
        issues.push({
          code: 'BOUNDS',
          message: `Entry ${entry.id} (${entry.answer}) exceeds grid ${data.grid.rows}×${data.grid.cols} at (${cell.row},${cell.col})`,
        });
        break;
      }
    }
  }

  const map = new Map<string, { letter: string; entryId: string }>();
  for (const entry of data.entries) {
    for (const cell of cellsFor(entry)) {
      const key = `${cell.row}:${cell.col}`;
      const prev = map.get(key);
      if (prev && prev.letter !== cell.letter) {
        issues.push({
          code: 'COLLISION',
          message: `Collision at (${cell.row},${cell.col}): ${prev.entryId}='${prev.letter}' vs ${entry.id}='${cell.letter}'`,
          wrongLetter: cell.letter,
        });
      } else if (!prev) {
        map.set(key, { letter: cell.letter, entryId: entry.id });
      }
    }
  }

  if (requireCrossing && data.entries.length >= 2) {
    let crosses = 0;
    const occ = new Map<string, number>();
    for (const entry of data.entries) {
      for (const cell of cellsFor(entry)) {
        const key = `${cell.row}:${cell.col}`;
        occ.set(key, (occ.get(key) ?? 0) + 1);
      }
    }
    for (const n of occ.values()) if (n >= 2) crosses++;
    if (crosses === 0) {
      issues.push({
        code: 'NO_CROSSING',
        message: 'Crossword entries share no cells — real-crossing rule failed',
      });
    }
  }

  if (data.links?.length) {
    const byId = new Map(data.entries.map((e) => [e.id, e]));
    for (const link of data.links) {
      const from = byId.get(link.fromEntryId);
      const to = byId.get(link.toEntryId);
      if (!from || !to) {
        issues.push({
          code: 'LINK',
          message: `Link references missing entry (${link.fromEntryId}→${link.toEntryId})`,
          fromId: link.fromEntryId,
          toId: link.toEntryId,
        });
        continue;
      }
      const letterIssue = checkLetterLink(from, to, link.letterIndex);
      if (letterIssue) {
        issues.push(letterIssue);
        continue;
      }
      const fromCells = cellsFor(from);
      const linkCell = fromCells[link.letterIndex - 1]!;
      if (linkCell.row !== to.row || linkCell.col !== to.col) {
        const suggestions = suggestLinkIndices(from.answer, to.answer);
        issues.push({
          code: 'LINK',
          message: `Link ${from.id}→${to.id}: letter ${link.letterIndex} ('${linkCell.letter}') is at (${linkCell.row},${linkCell.col}) but ${to.id} starts at (${to.row},${to.col}); ${formatSuggestions(suggestions)}`,
          wrongLetter: linkCell.letter,
          fromId: from.id,
          toId: to.id,
          letterIndex: link.letterIndex,
          suggestions,
        });
      }
    }
  }

  return issues.length ? { ok: false, issues } : { ok: true };
}

export function validateLayoutDoc(doc: LayoutEnvelope): IssueResult {
  const entries = doc.data.entries.map((e, i) => ({
    id: e.id,
    number: e.number ?? i + 1,
    direction: e.direction,
    row: e.row,
    col: e.col,
    answer: normalizeAnswer(e.answer),
    clue: e.clue,
    ref: e.ref,
  }));
  let maxR = 0;
  let maxC = 0;
  for (const e of entries) {
    for (const c of cellsFor(e)) {
      maxR = Math.max(maxR, c.row);
      maxC = Math.max(maxC, c.col);
    }
  }
  const data: CrosswordData = {
    grid: {
      rows: doc.data.grid?.rows ?? maxR + 1,
      cols: doc.data.grid?.cols ?? maxC + 1,
    },
    entries,
    links: doc.data.links,
  };
  return validateLayout(data);
}

export function layoutLinkFailures(data: CrosswordData): PuzzleIssue[] {
  const result = validateLayout(data, { requireCrossing: false });
  if (result.ok) return [];
  return result.issues.filter((i) => i.code === 'LINK');
}

export type { CrosswordEntry, CrosswordLink };
