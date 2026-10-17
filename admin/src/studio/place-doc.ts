import { compile } from '@askhub/puzzle-contracts';
import type { StudioDoc, StudioStep } from './doc-store';

type Direction = 'across' | 'down';

type PlacedEntry = {
  id: string;
  direction: Direction;
  row: number;
  col: number;
  answer: string;
  clue: string;
  ref: string;
  number?: number;
};

type PlacedLink = {
  fromEntryId: string;
  toEntryId: string;
  letterIndex: number;
};

function letters(answer: string) {
  return answer.toUpperCase().replace(/[^A-Z]/g, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

/** Chain order so each word's fromLetter refers to the previous step. */
function orderEntries(entries: PlacedEntry[], links: PlacedLink[]): PlacedEntry[] {
  if (links.length === 0) {
    return [...entries].sort(
      (a, b) => (a.number ?? 0) - (b.number ?? 0) || a.row - b.row || a.col - b.col,
    );
  }
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const incoming = new Set(links.map((link) => link.toEntryId));
  const outgoing = new Map(links.map((link) => [link.fromEntryId, link.toEntryId]));
  const start = entries.find((entry) => !incoming.has(entry.id)) ?? entries[0];
  const ordered: PlacedEntry[] = [];
  const seen = new Set<string>();
  let current: PlacedEntry | undefined = start;
  while (current && !seen.has(current.id)) {
    ordered.push(current);
    seen.add(current.id);
    const nextId = outgoing.get(current.id);
    current = nextId ? byId.get(nextId) : undefined;
  }
  for (const entry of entries) {
    if (!seen.has(entry.id)) ordered.push(entry);
  }
  return ordered;
}

function stepsFromEntries(entries: PlacedEntry[], links: PlacedLink[]): StudioStep[] {
  const fromLetter = new Map(links.map((link) => [link.toEntryId, link.letterIndex]));
  return orderEntries(entries, links).map((entry) => {
    const link = fromLetter.get(entry.id);
    return {
      id: entry.id,
      answer: entry.answer,
      direction: entry.direction,
      clue: entry.clue,
      ref: entry.ref,
      row: entry.row,
      col: entry.col,
      ...(link != null ? { fromLetter: link } : {}),
    };
  });
}

function readEntries(data: unknown): { entries: PlacedEntry[]; links: PlacedLink[] } | null {
  if (!isRecord(data) || !Array.isArray(data.entries)) return null;
  const entries: PlacedEntry[] = [];
  for (const item of data.entries) {
    if (!isRecord(item)) return null;
    const direction = item.direction === 'across' || item.direction === 'down' ? item.direction : null;
    if (
      direction == null ||
      typeof item.id !== 'string' ||
      typeof item.answer !== 'string' ||
      typeof item.row !== 'number' ||
      typeof item.col !== 'number'
    ) {
      return null;
    }
    entries.push({
      id: item.id,
      direction,
      row: item.row,
      col: item.col,
      answer: item.answer,
      clue: typeof item.clue === 'string' ? item.clue : '',
      ref: typeof item.ref === 'string' ? item.ref : '',
      number: typeof item.number === 'number' ? item.number : undefined,
    });
  }
  const links: PlacedLink[] = [];
  if (Array.isArray(data.links)) {
    for (const item of data.links) {
      if (!isRecord(item)) continue;
      if (
        typeof item.fromEntryId === 'string' &&
        typeof item.toEntryId === 'string' &&
        typeof item.letterIndex === 'number'
      ) {
        links.push({
          fromEntryId: item.fromEntryId,
          toEntryId: item.toEntryId,
          letterIndex: item.letterIndex,
        });
      }
    }
  }
  return { entries, links };
}

function envelopeMeta(raw: Record<string, unknown>) {
  const rewards = isRecord(raw.rewards) ? raw.rewards : {};
  return {
    schemaVersion: 1 as const,
    id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : 'Untitled puzzle',
    scripture: typeof raw.scripture === 'string' && raw.scripture.trim() ? raw.scripture : '—',
    rewards: { points: typeof rewards.points === 'number' ? rewards.points : 40 },
  };
}

/**
 * Turn a saved CHAIN, LAYOUT, or CROSSWORD document into studio steps
 * that already sit on the canvas.
 */
export function studioDocFromEnvelope(raw: unknown): StudioDoc | null {
  if (!isRecord(raw) || !isRecord(raw.data)) return null;
  const meta = envelopeMeta(raw);

  if (raw.type === 'CROSSWORD' || raw.type === 'LAYOUT') {
    const placed = readEntries(raw.data);
    if (!placed || placed.entries.length === 0) return null;
    return {
      ...meta,
      type: 'CHAIN',
      data: { steps: stepsFromEntries(placed.entries, placed.links) },
    };
  }

  if (raw.type === 'CHAIN' && Array.isArray(raw.data.steps)) {
    const steps: StudioStep[] = [];
    for (const item of raw.data.steps) {
      if (!isRecord(item) || typeof item.id !== 'string') return null;
      steps.push({
        id: item.id,
        answer: typeof item.answer === 'string' ? item.answer : '',
        direction: item.direction === 'down' ? 'down' : 'across',
        clue: typeof item.clue === 'string' ? item.clue : '',
        ref: typeof item.ref === 'string' ? item.ref : '',
        ...(typeof item.fromLetter === 'number' ? { fromLetter: item.fromLetter } : {}),
        ...(typeof item.row === 'number' ? { row: item.row } : {}),
        ...(typeof item.col === 'number' ? { col: item.col } : {}),
      });
    }
    return withPlacedCoordinates({ ...meta, type: 'CHAIN', data: { steps } });
  }

  return null;
}

/** Fill missing row/col from the chain compiler so a saved chain appears on the grid. */
export function withPlacedCoordinates(doc: StudioDoc): StudioDoc {
  const steps = doc.data.steps;
  if (steps.length === 0) return doc;
  const needsPlace = steps.some(
    (step) => letters(step.answer).length > 0 && (step.row == null || step.col == null),
  );
  if (!needsPlace) return doc;

  const result = compile(toChainDoc(doc));
  if (!result.ok) return doc;
  const byId = new Map(result.canonical.data.entries.map((entry) => [entry.id, entry]));
  return {
    ...doc,
    data: {
      steps: steps.map((step) => {
        const placed = byId.get(step.id);
        if (!placed || (step.row != null && step.col != null)) return step;
        return { ...step, row: placed.row, col: placed.col };
      }),
    },
  };
}

function toChainDoc(doc: StudioDoc) {
  return {
    schemaVersion: 1 as const,
    id: doc.id,
    type: 'CHAIN' as const,
    title: doc.title.trim() || 'Untitled puzzle',
    scripture: doc.scripture.trim() || '—',
    rewards: doc.rewards,
    data: {
      steps: doc.data.steps.map((step) => ({
        id: step.id,
        answer: letters(step.answer) || 'X',
        direction: step.direction,
        clue: step.clue.trim() || '—',
        ref: step.ref.trim() || '—',
        ...(step.fromLetter != null ? { fromLetter: step.fromLetter } : {}),
      })),
    },
  };
}

/** Body for POST /api/puzzles/publish. Placed words keep their grid cells. Blank cards are omitted. */
export function toPublishDoc(doc: StudioDoc) {
  const sourceSteps = doc.data.steps;
  const meaningful = sourceSteps.filter((step) => letters(step.answer).length > 0);
  const allPlaced =
    meaningful.length > 0 && meaningful.every((step) => step.row != null && step.col != null);

  if (allPlaced) {
    const indexOf = new Map(sourceSteps.map((step, index) => [step.id, index]));
    const links = [];
    for (let i = 1; i < meaningful.length; i++) {
      const step = meaningful[i]!;
      const prev = meaningful[i - 1]!;
      const stepIndex = indexOf.get(step.id);
      const prevIndex = indexOf.get(prev.id);
      if (step.fromLetter == null || stepIndex == null || prevIndex == null) continue;
      if (stepIndex !== prevIndex + 1) continue;
      links.push({
        fromEntryId: prev.id,
        toEntryId: step.id,
        letterIndex: step.fromLetter,
      });
    }
    return {
      schemaVersion: 1 as const,
      id: doc.id,
      type: 'LAYOUT' as const,
      title: doc.title.trim() || 'Untitled puzzle',
      scripture: doc.scripture.trim() || '—',
      rewards: doc.rewards,
      data: {
        entries: meaningful.map((step) => ({
          id: step.id,
          direction: step.direction,
          row: step.row!,
          col: step.col!,
          answer: letters(step.answer),
          clue: step.clue.trim(),
          ref: step.ref.trim(),
        })),
        ...(links.length > 0 ? { links } : {}),
      },
    };
  }

  return {
    schemaVersion: 1 as const,
    id: doc.id,
    type: 'CHAIN' as const,
    title: doc.title.trim() || 'Untitled puzzle',
    scripture: doc.scripture.trim() || '—',
    rewards: doc.rewards,
    data: {
      steps: meaningful.map((step) => ({
        id: step.id,
        answer: step.answer,
        direction: step.direction,
        clue: step.clue,
        ref: step.ref,
        ...(step.fromLetter != null ? { fromLetter: step.fromLetter } : {}),
      })),
    },
  };
}
