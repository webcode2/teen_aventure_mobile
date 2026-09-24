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
};

export function emptyDoc(title = 'Week 1'): StudioDoc {
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    type: 'CHAIN',
    title,
    scripture: '',
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
  };
}

export type StudioAction =
  | { type: 'replace'; doc: StudioDoc; draftId?: string | null; version?: number }
  | { type: 'setMeta'; title?: string; scripture?: string }
  | { type: 'addStep'; step: StudioStep }
  | { type: 'updateStep'; id: string; patch: Partial<StudioStep> }
  /** Live typing — bumps autosave version but does not push undo history. */
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
  | { type: 'setDraftId'; id: string };

const MAX_HISTORY = 80;

function commit(state: StudioState, next: StudioDoc): StudioState {
  return {
    ...state,
    past: [...state.past, state.present].slice(-MAX_HISTORY),
    present: next,
    future: [],
    version: state.version + 1,
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
      return {
        ...state,
        present: { ...state.present, data: { steps } },
        version: state.version + 1,
      };
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
    case 'undo': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1]!;
      return {
        ...state,
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        version: state.version + 1,
      };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        ...state,
        past: [...state.past, state.present],
        present: next!,
        future: rest,
        version: state.version + 1,
      };
    }
    default:
      return state;
  }
}
