import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_HISTORY,
  UNDO_SNAPSHOT_MS,
  emptyDoc,
  initialState,
  studioHistoryShortcut,
  studioReducer,
  withoutEmptySteps,
  type StudioStep,
} from './doc-store';

const step: StudioStep = {
  id: 'w1',
  answer: '',
  direction: 'across',
  clue: '',
  ref: '',
};

function withStep(answer: string) {
  return studioReducer(initialState(), { type: 'addStep', step: { ...step, answer } });
}

describe('studio undo snapshots', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('groups edits inside one second into a single step', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T10:00:00.000Z'));
    let state = withStep('');
    vi.advanceTimersByTime(UNDO_SNAPSHOT_MS);
    state = studioReducer(state, { type: 'updateStep', id: 'w1', patch: { answer: 'A' } });
    vi.advanceTimersByTime(400);
    state = studioReducer(state, { type: 'updateStep', id: 'w1', patch: { answer: 'AB' } });
    vi.advanceTimersByTime(400);
    state = studioReducer(state, { type: 'patchStep', id: 'w1', patch: { answer: 'ABC' } });

    expect(state.present.data.steps[0]?.answer).toBe('ABC');
    expect(state.past).toHaveLength(2);

    state = studioReducer(state, { type: 'undo' });
    expect(state.present.data.steps[0]?.answer).toBe('');
    expect(state.past).toHaveLength(1);
  });

  it('starts a new step after one second and keeps only the last four', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T10:00:00.000Z'));
    let state = withStep('');
    for (let i = 1; i <= 5; i++) {
      vi.advanceTimersByTime(UNDO_SNAPSHOT_MS);
      state = studioReducer(state, { type: 'updateStep', id: 'w1', patch: { answer: 'A'.repeat(i) } });
    }

    expect(state.past).toHaveLength(MAX_HISTORY);
    expect(state.present.data.steps[0]?.answer).toBe('AAAAA');

    const restored: string[] = [];
    for (let i = 0; i < MAX_HISTORY; i++) {
      state = studioReducer(state, { type: 'undo' });
      restored.push(state.present.data.steps[0]?.answer ?? '');
    }
    expect(restored).toEqual(['AAAA', 'AAA', 'AA', 'A']);
    expect(studioReducer(state, { type: 'undo' })).toBe(state);
  });

  it('steps forward with redo and drops the redo stack after a new edit', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T10:00:00.000Z'));
    let state = withStep('ONE');
    vi.advanceTimersByTime(UNDO_SNAPSHOT_MS);
    state = studioReducer(state, { type: 'updateStep', id: 'w1', patch: { answer: 'TWO' } });
    state = studioReducer(state, { type: 'undo' });
    expect(state.present.data.steps[0]?.answer).toBe('ONE');

    state = studioReducer(state, { type: 'redo' });
    expect(state.present.data.steps[0]?.answer).toBe('TWO');

    state = studioReducer(state, { type: 'undo' });
    vi.advanceTimersByTime(UNDO_SNAPSHOT_MS);
    state = studioReducer(state, { type: 'updateStep', id: 'w1', patch: { answer: 'THREE' } });
    expect(state.future).toHaveLength(0);
    expect(state.present.data.steps[0]?.answer).toBe('THREE');
  });

  it('drops blank word cards without counting a new edit', () => {
    let state = withStep('ISAAC');
    state = studioReducer(state, {
      type: 'addStep',
      step: { id: 'blank', answer: '', direction: 'across', clue: '', ref: '' },
    });
    const version = state.version;
    state = studioReducer(state, { type: 'select', id: 'blank' });
    state = studioReducer(state, { type: 'dropEmpty' });
    expect(state.present.data.steps.map((step) => step.answer)).toEqual(['ISAAC']);
    expect(state.selectedStepId).toBeNull();
    expect(state.version).toBe(version);
    expect(withoutEmptySteps(state.present)).toBe(state.present);
  });

  it('drops the undo copies without changing the puzzle', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T10:00:00.000Z'));
    let state = withStep('ONE');
    vi.advanceTimersByTime(UNDO_SNAPSHOT_MS);
    state = studioReducer(state, { type: 'updateStep', id: 'w1', patch: { answer: 'TWO' } });
    const version = state.version;
    state = studioReducer(state, { type: 'clearHistory' });
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(0);
    expect(state.present.data.steps[0]?.answer).toBe('TWO');
    expect(state.version).toBe(version);
    expect(studioReducer(state, { type: 'undo' })).toBe(state);
  });

  it('maps Ctrl+Z and Ctrl+Shift+Z', () => {
    const base = { key: 'z', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false };
    expect(studioHistoryShortcut(base)).toBe('undo');
    expect(studioHistoryShortcut({ ...base, shiftKey: true, key: 'Z' })).toBe('redo');
    expect(studioHistoryShortcut({ ...base, ctrlKey: false })).toBeNull();
    expect(studioHistoryShortcut({ ...base, altKey: true })).toBeNull();
    expect(emptyDoc().type).toBe('CHAIN');
  });
});
