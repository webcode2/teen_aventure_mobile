import { useMemo } from 'react';
import { validateChain, type PuzzleIssue } from '@askhub/puzzles/validate.ts';
import type { StudioDoc, StudioStep } from './doc-store';

type Props = {
  doc: StudioDoc;
  onLocate: (path: Array<string | number>, stepId?: string) => void;
};

function letters(answer: string) {
  return answer.toUpperCase().replace(/[^A-Z]/g, '');
}

function wordLabel(doc: StudioDoc, stepId: string | undefined): string {
  if (!stepId) return 'a word';
  const idx = doc.data.steps.findIndex((s) => s.id === stepId);
  if (idx < 0) return 'a word';
  const step = doc.data.steps[idx]!;
  const ans = letters(step.answer);
  return ans ? `Word ${idx + 1} (${ans})` : `Word ${idx + 1}`;
}

/** Project studio doc → CHAIN shape for validate() (drop canvas row/col). */
function toChainForValidate(doc: StudioDoc) {
  return {
    schemaVersion: 1 as const,
    id: doc.id,
    type: 'CHAIN' as const,
    title: doc.title,
    scripture: doc.scripture || '—',
    rewards: doc.rewards,
    data: {
      steps: doc.data.steps.map((s) => ({
        id: s.id,
        answer: s.answer,
        direction: s.direction,
        clue: s.clue,
        ref: s.ref,
        ...(s.fromLetter != null ? { fromLetter: s.fromLetter } : {}),
      })),
    },
  };
}

function humanMessage(doc: StudioDoc, issue: PuzzleIssue): string {
  const stepIdx = typeof issue.path?.[2] === 'number' ? issue.path[2] : undefined;
  const stepId =
    issue.toId ??
    issue.fromId ??
    (stepIdx != null ? doc.data.steps[stepIdx]?.id : undefined);
  const label = wordLabel(doc, stepId);
  const fromLabel = wordLabel(doc, issue.fromId);
  const toLabel = wordLabel(doc, issue.toId);

  // Prefer friendly copy over raw validator text (which embeds UUIDs).
  switch (issue.code) {
    case 'CLUE_REF':
      if (issue.message.includes('clue')) return `${label}: add a clue`;
      if (issue.message.includes('ref')) return `${label}: add a scripture reference`;
      return `${label}: clue or scripture is missing`;
    case 'CHAIN':
      if (issue.message.includes('no letters')) return `${label}: type an answer`;
      if (issue.message.includes('first step')) return `${label}: first word should not link from another`;
      return `${label}: fix the chain connection`;
    case 'LINK':
      if (issue.message.includes('missing fromLetter')) {
        return `${toLabel}: place it so it shares a letter with ${fromLabel}`;
      }
      return `Link ${fromLabel} → ${toLabel}: adjust the shared letter`;
    default:
      return issue.message
        .replace(/Step [0-9a-f-]{36}/gi, label)
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'word');
  }
}

/** Hide noisy WIP issues until the word has an answer on the board. */
function isActionable(doc: StudioDoc, issue: PuzzleIssue): boolean {
  const stepIdx = typeof issue.path?.[2] === 'number' ? issue.path[2] : undefined;
  const step: StudioStep | undefined =
    stepIdx != null
      ? doc.data.steps[stepIdx]
      : doc.data.steps.find((s) => s.id === issue.toId || s.id === issue.fromId);

  if (!step) return true;
  const ans = letters(step.answer);
  // Empty brand-new chips: don't spam "answer has no letters" / empty clue.
  if (!ans && (issue.message.includes('no letters') || issue.code === 'CLUE_REF')) {
    return false;
  }
  // Clue/ref tips only after the word is placed on the grid.
  if (issue.code === 'CLUE_REF' && (step.row == null || step.col == null)) {
    return false;
  }
  return true;
}

export function IssuesPanel({ doc, onLocate }: Props) {
  const issues = useMemo(() => {
    if (doc.data.steps.length === 0) return [];
    const result = validateChain(toChainForValidate(doc));
    if (result.ok) return [];
    return result.issues.filter((i) => isActionable(doc, i));
  }, [doc]);

  return (
    <div className="bg-surface border border-border rounded-card p-4 shadow-xs flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
        <h3 className="text-sm font-bold text-navy">Checklist</h3>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${
            issues.length
              ? 'bg-error-bg text-error border-error/20'
              : 'bg-sage text-forest border-forest/20'
          }`}
        >
          {issues.length === 0 ? 'Ready' : `${issues.length} to fix`}
        </span>
      </div>
      {issues.length === 0 ? (
        <p className="text-xs text-muted m-0">Looking good — place words, add clues, then publish.</p>
      ) : (
        <ul className="flex flex-col gap-2 list-none p-0 m-0">
          {issues.map((issue, i) => (
            <li key={`${issue.code}-${i}`}>
              <button
                type="button"
                className="w-full text-left p-2.5 rounded-lg border border-border bg-cream hover:border-orange text-xs text-navy transition-colors cursor-pointer text-pretty"
                onClick={() => locate(issue, onLocate, doc)}
              >
                {humanMessage(doc, issue)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function locate(
  issue: PuzzleIssue,
  onLocate: (path: Array<string | number>, stepId?: string) => void,
  doc: StudioDoc,
) {
  const path = issue.path ?? [];
  const stepIdx = typeof path[2] === 'number' ? path[2] : undefined;
  const stepId =
    issue.toId ??
    issue.fromId ??
    (stepIdx != null ? doc.data.steps[stepIdx]?.id : undefined);
  onLocate(path, stepId);
}
