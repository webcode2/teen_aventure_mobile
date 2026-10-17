import { useMemo } from 'react';
import { validateChain, type PuzzleIssue } from '@askhub/puzzle-contracts';
import type { StudioDoc, StudioStep } from './doc-store';
import { clueNumberById } from './clue-numbers';

type Props = {
  doc: StudioDoc;
  onLocate: (path: Array<string | number>, stepId?: string) => void;
};

function letters(answer: string) {
  return answer.toUpperCase().replace(/[^A-Z]/g, '');
}

function wordLabel(doc: StudioDoc, stepId: string | undefined): string {
  if (!stepId) return 'a word';
  const step = doc.data.steps.find((s) => s.id === stepId);
  if (!step) return 'a word';
  const number = clueNumberById(doc.data.steps).get(stepId);
  const name = number != null ? `Word ${number}` : 'Word';
  const ans = letters(step.answer);
  return ans ? `${name} (${ans})` : name;
}

/** Project studio doc → CHAIN shape for validate() (drop canvas row/col). */
function toChainForValidate(doc: StudioDoc) {
  return {
    schemaVersion: 1 as const,
    id: doc.id,
    type: 'CHAIN' as const,
    title: doc.title,
    scripture: doc.scripture,
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
  // A word already sitting on the grid does not also need a chain link.
  if (issue.code === 'LINK' && step.row != null && step.col != null) return false;
  const ans = letters(step.answer);
  // Empty brand-new chips: don't spam "answer has no letters" / empty clue.
  if (!ans && (issue.message.includes('no letters') || issue.code === 'CLUE_REF')) {
    return false;
  }
  // A scripture reference is required as soon as the word has an answer.
  if (issue.code === 'CLUE_REF' && issue.message.includes('ref') && ans) return true;
  // Other clue tips wait until the word is on the grid.
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

  if (issues.length === 0) return null;

  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {issues.map((issue, i) => (
        <li key={`${issue.code}-${i}`}>
          <button
            type="button"
            className="cursor-pointer bg-transparent p-0 text-left text-xs text-orange"
            onClick={() => locate(issue, onLocate, doc)}
          >
            {humanMessage(doc, issue)}
          </button>
        </li>
      ))}
    </ul>
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
