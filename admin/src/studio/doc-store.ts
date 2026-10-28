/** Doc store: undo/redo + monotonic version for debounced WIP autosave. */

export type StudioStep = {
  id: string;
  answer: string;
  direction: 'across' | 'down';
  clue: string;
  ref: string;
  fromLetter?: number;
  /** Absolute placement once locked on canvas (LAYOUT hybrid). */
  row?: number;
  col?: number;
};

export type StudioDoc = {
  schemaVersion: 1;
  id: string;
  type: 'CHAIN';
  title: string;
  scripture: string;
  rewards: { points?: number };
  data: { steps: StudioStep[] };
};

export type StudioState = {
  past: StudioDoc[];
  present: StudioDoc;
  future: StudioDoc[];
  /** Bumped on every committed edit — sent with autosave. */
  version: number;
  draftId: string | null;
  selectedStepId: string | null;
  /** Index into present.data.steps for ghost target (next after selected). */
  locateIssuePath: Array<string | number> | null;
  /** Start time of the open undo snapshot. Edits inside the next second share it. */
  historyAt: number | null;
};

export function hasAnswerLetters(answer: string) {
  return /[A-Za-z]/.test(answer);
}

/** Blank “Word” cards are editor scratch space. They are not part of the puzzle. */
export function withoutEmptySteps(doc: StudioDoc): StudioDoc {
  const steps = doc.data.steps.filter((step) => hasAnswerLetters(step.answer));
  if (steps.length === doc.data.steps.length) return doc;
  return { ...doc, data: { steps } };
}

export function emptyDoc(title = 'Untitled puzzle'): StudioDoc {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    type: 'CHAIN',
    title,
    // Schema requires min(1); per-word refs carry real citations.
    scripture: '—',
    rewards: { points: 40 },
    data: { steps: [] },
  };
}

export function initialState(doc?: StudioDoc): StudioState {
  return {
    past: [],
    present: doc ?? emptyDoc(),
    future: [],
    version: 1,
    draftId: null,
    selectedStepId: null,
    locateIssuePath: null,
    historyAt: null,
  };
}

export type StudioAction =
  | { type: 'replace'; doc: StudioDoc; draftId?: string | null; version?: number }
  | { type: 'setMeta'; title?: string; scripture?: string }
  | { type: 'addStep'; step: StudioStep }
  | { type: 'addSteps'; steps: StudioStep[] }
  | { type: 'updateStep'; id: string; patch: Partial<StudioStep> }
  /** Live typing. Shares the open 1s undo snapshot instead of a new step per letter. */
  | { type: 'patchStep'; id: string; patch: Partial<StudioStep> }
  | { type: 'removeStep'; id: string }
  | { type: 'placeStep'; id: string; row: number; col: number; fromLetter?: number }
  | {
      type: 'placeMany';
      updates: Array<{ id: string; row: number; col: number; fromLetter?: number }>;
    }
  | { type: 'select'; id: string | null }
  | { type: 'locate'; path: Array<string | number> | null }
  | { type: 'undo' }
  | { type: 'redo' }
  /** Drop the in-memory undo copies. The puzzle itself stays. */
  | { type: 'clearHistory' }
  /** Remove word cards that have no letters. Does not count as an edit. */
  | { type: 'dropEmpty' }
  | { type: 'setDraftId'; id: string | null };

/**
 * How many snapshot steps Ctrl+Z can walk back.
 * These copies live in tab memory only. They are not written to localStorage or the database.
 */
export const MAX_HISTORY = 4;
/** Edits inside this window share one undo step. */
export const UNDO_SNAPSHOT_MS = 1000;

function commit(state: StudioState, next: StudioDoc, now = Date.now()): StudioState {
  const inSnapshot =
    state.historyAt != null && now - state.historyAt < UNDO_SNAPSHOT_MS;
  if (inSnapshot) {
    return {
      ...state,
      present: next,
      future: [],
      version: state.version + 1,
    };
  }
  return {
    ...state,
    past: [...state.past, state.present].slice(-MAX_HISTORY),
    present: next,
    future: [],
    version: state.version + 1,
    historyAt: now,
  };
}

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case 'replace':
      return {
        ...initialState(action.doc),
        draftId: action.draftId ?? state.draftId,
        version: action.version ?? 1,
      };
    case 'setDraftId':
      return { ...state, draftId: action.id };
    case 'setMeta': {
      const next = {
        ...state.present,
        title: action.title ?? state.present.title,
        scripture: action.scripture ?? state.present.scripture,
      };
      return commit(state, next);
    }
    case 'addSteps':
      if (!action.steps.length) return state;
      return commit({ ...state, historyAt: null, selectedStepId: action.steps[0]!.id }, {
        ...state.present,
        data: { steps: [...state.present.data.steps, ...action.steps] },
      });
    case 'addStep':
      return commit(state, {
        ...state.present,
        data: { steps: [...state.present.data.steps, action.step] },
      });
    case 'updateStep': {
      const steps = state.present.data.steps.map((s) =>
        s.id === action.id ? { ...s, ...action.patch } : s,
      );
      return commit(state, { ...state.present, data: { steps } });
    }
    case 'patchStep': {
      const steps = state.present.data.steps.map((s) =>
        s.id === action.id ? { ...s, ...action.patch } : s,
      );
      return commit(state, { ...state.present, data: { steps } });
    }
    case 'removeStep': {
      const steps = state.present.data.steps.filter((s) => s.id !== action.id);
      return commit(state, {
        ...state.present,
        data: { steps },
      });
    }
    case 'placeStep': {
      const steps = state.present.data.steps.map((s) => {
        if (s.id !== action.id) return s;
        return {
          ...s,
          row: action.row,
          col: action.col,
          ...(action.fromLetter != null ? { fromLetter: action.fromLetter } : {}),
        };
      });
      return commit(state, { ...state.present, data: { steps } });
    }
    case 'placeMany': {
      const byId = new Map(action.updates.map((u) => [u.id, u]));
      const steps = state.present.data.steps.map((s) => {
        const u = byId.get(s.id);
        if (!u) return s;
        return {
          ...s,
          row: u.row,
          col: u.col,
          ...(u.fromLetter != null ? { fromLetter: u.fromLetter } : {}),
        };
      });
      return commit(state, { ...state.present, data: { steps } });
    }
    case 'select':
      return { ...state, selectedStepId: action.id };
    case 'locate':
      return { ...state, locateIssuePath: action.path };
    case 'clearHistory':
      return { ...state, past: [], future: [], historyAt: null };
    case 'dropEmpty': {
      const present = withoutEmptySteps(state.present);
      if (present === state.present) return state;
      const selectedStillThere = present.data.steps.some((step) => step.id === state.selectedStepId);
      return {
        ...state,
        present,
        selectedStepId: selectedStillThere ? state.selectedStepId : null,
      };
    }
    case 'undo': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1]!;
      return {
        ...state,
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future].slice(0, MAX_HISTORY),
        version: state.version + 1,
        historyAt: null,
      };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        ...state,
        past: [...state.past, state.present].slice(-MAX_HISTORY),
        present: next!,
        future: rest,
        version: state.version + 1,
        historyAt: null,
      };
    }
    default:
      return state;
  }
}

/** Ctrl+Z steps back one snapshot. Ctrl+Shift+Z steps forward. */
export function studioHistoryShortcut(e: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): 'undo' | 'redo' | null {
  if (e.altKey || !(e.ctrlKey || e.metaKey)) return null;
  if (e.key.toLowerCase() !== 'z') return null;
  return e.shiftKey ? 'redo' : 'undo';
}
