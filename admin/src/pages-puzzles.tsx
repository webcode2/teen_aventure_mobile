import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Alert, Button } from './ui';
import { api, ApiError } from './api';
import {
  emptyDoc,
  initialState,
  studioHistoryShortcut,
  studioReducer,
  type StudioDoc,
  type StudioStep,
} from './studio/doc-store';
import { compile } from '@askhub/puzzle-contracts';
import { studioDocFromEnvelope, toPublishDoc, withPlacedCoordinates } from './studio/place-doc';
import { useDebouncedDraftAutosave } from './studio/use-debounced-autosave';
import { WordListEditor } from './studio/WordListEditor';
import { PuzzleCanvas } from './studio/PuzzleCanvas';
import { IssuesPanel } from './studio/IssuesPanel';

/** Used by quest list helpers that still parse week from older puzzle titles. */
export function weekTitle(weekNumber: number): string {
  return `Week ${weekNumber}`;
}

export function parseWeekNumber(title: string): number | null {
  const m = /^Week\s+(\d+)\b/i.exec(title.trim()) || /^(\d+)$/.exec(title.trim());
  return m ? Number(m[1]) : null;
}

export function PuzzlesStudioPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const editPuzzle = searchParams.get('editPuzzle');
  const openDraftId = searchParams.get('draft');
  const openVersionId = searchParams.get('version');
  const startNew = searchParams.get('new') === '1';
  const seedTitle = searchParams.get('title')?.trim() || '';
  const openedEditPuzzle = useRef<string | null>(null);
  const openedDraft = useRef<string | null>(null);
  const openedVersion = useRef<string | null>(null);
  const startedNew = useRef(false);
  const [state, dispatch] = useReducer(studioReducer, undefined, () => initialState());
  const [openError, setOpenError] = useState('');
  const [highlight, setHighlight] = useState<{ row: number; col: number } | null>(null);
  const [publishError, setPublishError] = useState('');
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishVersion, setPublishVersion] = useState<number | null>(null);
  const [nextPublishVersion, setNextPublishVersion] = useState<number | null>(null);
  const [editingLive, setEditingLive] = useState(false);
  const [draftsPaused, setDraftsPaused] = useState(false);
  const discardDraftSaves = useRef(false);
  const draftHold = useRef(false);
  const pausedVersion = useRef<number | null>(null);

  useEffect(() => {
    if (!draftsPaused) return;
    if (pausedVersion.current == null) {
      pausedVersion.current = state.version;
      return;
    }
    if (state.version !== pausedVersion.current) {
      pausedVersion.current = null;
      discardDraftSaves.current = false;
      draftHold.current = false;
      setDraftsPaused(false);
    }
  }, [draftsPaused, state.version]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const shortcut = studioHistoryShortcut(e);
      if (!shortcut) return;
      e.preventDefault();
      dispatch({ type: shortcut });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onDraftId = useCallback((id: string) => {
    if (discardDraftSaves.current) {
      void api(`/api/puzzle-drafts/${id}`, { method: 'DELETE' }).catch(() => {});
      return;
    }
    dispatch({ type: 'setDraftId', id });
  }, []);

  const { status: saveStatus, error: saveError, conflict, clearConflict } = useDebouncedDraftAutosave({
    draftId: state.draftId,
    version: state.version,
    doc: state.present,
    enabled: !draftsPaused,
    holdRef: draftHold,
    onDraftId,
    onDroppedEmpty: () => dispatch({ type: 'dropEmpty' }),
  });

  // Quest “Create new puzzle” → blank draft (optionally titled from the week).
  useEffect(() => {
    if (!startNew || editPuzzle || openDraftId || openVersionId || startedNew.current) return;
    startedNew.current = true;
    const title = seedTitle || 'Untitled puzzle';
    dispatch({ type: 'replace', doc: emptyDoc(title), draftId: null, version: 1 });
    setPublishVersion(null);
    setNextPublishVersion(null);
    setEditingLive(false);
    clearConflict();
  }, [startNew, editPuzzle, openDraftId, openVersionId, seedTitle, clearConflict]);

  function addStep() {
    const step: StudioStep = {
      id: crypto.randomUUID(),
      answer: '',
      direction: state.present.data.steps.length % 2 === 0 ? 'across' : 'down',
      clue: '',
      ref: '',
    };
    dispatch({ type: 'addStep', step });
    dispatch({ type: 'select', id: step.id });
  }

  function startWordAt(row: number, col: number) {
    const reuse = state.present.data.steps.find(
      (s) => s.id === state.selectedStepId && !s.answer.trim() && (s.row == null || s.col == null),
    );
    if (reuse) {
      dispatch({ type: 'placeStep', id: reuse.id, row, col });
      dispatch({ type: 'select', id: reuse.id });
      return;
    }
    const step: StudioStep = {
      id: crypto.randomUUID(),
      answer: '',
      direction: state.present.data.steps.length % 2 === 0 ? 'across' : 'down',
      clue: '',
      ref: '',
      row,
      col,
    };
    dispatch({ type: 'addStep', step });
    dispatch({ type: 'select', id: step.id });
  }

  function loadOnGrid(doc: StudioDoc, draftId: string | null, version: number) {
    const placed = withPlacedCoordinates(doc);
    const first = placed.data.steps[0];
    dispatch({
      type: 'replace',
      doc: placed,
      draftId,
      version,
    });
    if (first) dispatch({ type: 'select', id: first.id });
    setPublishVersion(null);
    clearConflict();
  }

  async function openDraft(id: string) {
    try {
      const row = await api<{ id: string; version: number; doc: StudioDoc }>(
        `/api/puzzle-drafts/${id}`,
      );
      setOpenError('');
      setNextPublishVersion(null);
      setEditingLive(false);
      loadOnGrid(row.doc, row.id, row.version);
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : 'Failed to open draft');
    }
  }

  async function openLivePuzzle(puzzleId: string) {
    try {
      const row = await api<{ id: string; version: number; status: string; title: string; doc: unknown }>(
        `/api/puzzles/id/${puzzleId}/live`,
      );
      const doc = studioDocFromEnvelope(row.doc);
      if (!doc) {
        setOpenError('This puzzle has no grid to edit.');
        return;
      }
      setOpenError('');
      setNextPublishVersion(row.version + 1);
      setEditingLive(row.status === 'LIVE');
      loadOnGrid(doc, null, 1);
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : 'Failed to open puzzle');
    }
  }

  async function openPublished(versionId: string) {
    try {
      const row = await api<{ id: string; version: number; status: string; title: string; doc: unknown }>(
        `/api/puzzles/versions/${versionId}`,
      );
      const doc = studioDocFromEnvelope(row.doc);
      if (!doc) {
        setOpenError('This published puzzle has no grid to edit.');
        return;
      }
      setOpenError('');
      setNextPublishVersion(row.version + 1);
      setEditingLive(row.status === 'LIVE');
      loadOnGrid(doc, null, 1);
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : 'Failed to open puzzle');
    }
  }

  useEffect(() => {
    if (!editPuzzle || openedEditPuzzle.current === editPuzzle) return;
    openedEditPuzzle.current = editPuzzle;
    void openLivePuzzle(editPuzzle);
  }, [editPuzzle]);

  useEffect(() => {
    if (!openDraftId || openedDraft.current === openDraftId) return;
    openedDraft.current = openDraftId;
    void openDraft(openDraftId);
  }, [openDraftId]);

  useEffect(() => {
    if (!openVersionId || openedVersion.current === openVersionId) return;
    openedVersion.current = openVersionId;
    void openPublished(openVersionId);
  }, [openVersionId]);

  function newDraft() {
    dispatch({ type: 'replace', doc: emptyDoc(), draftId: null, version: 1 });
    setPublishVersion(null);
    setNextPublishVersion(null);
    setEditingLive(false);
    clearConflict();
  }

  function reloadTheirs() {
    if (!conflict?.serverDoc) return;
    dispatch({
      type: 'replace',
      doc: conflict.serverDoc as StudioDoc,
      draftId: state.draftId,
      version: conflict.serverVersion,
    });
    clearConflict();
  }

  async function keepMine() {
    if (!conflict || !state.draftId) return;
    const nextVersion = Math.max(conflict.serverVersion, conflict.localVersion) + 1;
    try {
      await api('/api/puzzle-drafts', {
        method: 'PUT',
        body: JSON.stringify({
          id: state.draftId,
          version: nextVersion,
          title: conflict.localDoc.title,
          doc: conflict.localDoc,
        }),
      });
      dispatch({
        type: 'replace',
        doc: conflict.localDoc,
        draftId: state.draftId,
        version: nextVersion,
      });
      clearConflict();
    } catch (e) {
      setOpenError(e instanceof Error ? e.message : 'Keep mine failed');
    }
  }

  async function publishStaged() {
    setPublishBusy(true);
    setPublishError('');
    const version = nextPublishVersion ?? publishVersion ?? state.version;
    setPublishVersion(version);
    const doc = state.present.scripture.trim()
      ? state.present
      : { ...state.present, scripture: '—' };
    if (doc !== state.present) {
      dispatch({ type: 'setMeta', scripture: '—' });
    }
    const missingScripture = doc.data.steps.filter(
      (step) => step.answer.replace(/[^A-Za-z]/g, '') && !step.ref.trim(),
    );
    if (missingScripture.length > 0) {
      const names = missingScripture.map((step) => step.answer.trim() || 'A word').join(', ');
      setPublishError(`Scripture reference is required. Add one for ${names}.`);
      const first = missingScripture[0];
      if (first) dispatch({ type: 'select', id: first.id });
      setPublishBusy(false);
      return;
    }
    const body = toPublishDoc(doc);
    const checked = compile(body);
    if (!checked.ok) {
      const missingRef = checked.issues.some((issue) => /ref|scripture/i.test(issue.message));
      const missingClue = checked.issues.some((issue) => /clue/i.test(issue.message));
      setPublishError(
        missingRef
          ? 'Add a scripture reference for every word, then publish.'
          : missingClue
            ? 'Add a clue for every word, then publish.'
            : checked.issues.map((issue) => issue.message).join(' '),
      );
      setPublishBusy(false);
      return;
    }
    try {
      const published = await api<{
        puzzle: { id: string };
        version: { id: string; version: number };
      }>('/api/puzzles/publish', {
        method: 'POST',
        body: JSON.stringify({
          doc: body,
          version,
          title: body.title,
        }),
      });
      if (editingLive) {
        await api(`/api/puzzles/versions/${published.version.id}/promote`, { method: 'POST', body: '{}' });
      }
      discardDraftSaves.current = true;
      draftHold.current = true;
      const finishedDraftId = state.draftId;
      if (finishedDraftId) {
        try {
          await api(`/api/puzzle-drafts/${finishedDraftId}`, { method: 'DELETE' });
        } catch {
          // Published copy is what matters.
        }
      }
      dispatch({ type: 'setDraftId', id: null });
      dispatch({ type: 'clearHistory' });
      setDraftsPaused(true);
      dispatch({ type: 'dropEmpty' });
      setNextPublishVersion(published.version.version + 1);
      setPublishVersion(null);
      if (returnTo && published.puzzle?.id) {
        const sep = returnTo.includes('?') ? '&' : '?';
        navigate(`${returnTo}${sep}puzzleId=${encodeURIComponent(published.puzzle.id)}`);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        setPublishError(e.message);
      } else {
        setPublishError(e instanceof Error ? e.message : 'Publish failed');
      }
    } finally {
      setPublishBusy(false);
    }
  }

  const locateIssue = (path: Array<string | number>, stepId?: string) => {
    dispatch({ type: 'locate', path });
    if (stepId) {
      dispatch({ type: 'select', id: stepId });
      const step = state.present.data.steps.find((s) => s.id === stepId);
      if (step?.row != null && step.col != null) {
        setHighlight({ row: step.row, col: step.col });
      }
    }
  };

  const scriptureMissing = state.present.data.steps.some(
    (step) => step.answer.replace(/[^A-Za-z]/g, '') && !step.ref.trim(),
  );
  const quietButton =
    'cursor-pointer bg-transparent px-2 py-1 text-xs font-semibold text-navy hover:text-teal disabled:opacity-40';

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {returnTo ? (
            <button
              type="button"
              className="mb-1 cursor-pointer bg-transparent p-0 text-xs font-semibold text-teal"
              onClick={() => navigate(returnTo)}
            >
              ← Back to quest
            </button>
          ) : null}
          <input
            aria-label="Puzzle title"
            value={state.present.title}
            onChange={(e) => dispatch({ type: 'setMeta', title: e.target.value })}
            placeholder="Untitled puzzle"
            className="w-full bg-transparent text-2xl font-semibold tracking-tight text-navy outline-none placeholder:text-muted"
          />
          <p className="m-0 text-[11px] text-muted" role="status">
            {saveStatus === 'error'
              ? saveError || 'Offline'
              : saveStatus === 'saving'
                ? 'Saving…'
                : saveStatus === 'saved'
                  ? 'Saved'
                  : 'Draft'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className={quietButton} onClick={newDraft}>
            New
          </button>
          <button
            type="button"
            className={quietButton}
            title="Ctrl+Z"
            disabled={state.past.length === 0}
            onClick={() => dispatch({ type: 'undo' })}
          >
            Undo
          </button>
          <button
            type="button"
            className={quietButton}
            title="Ctrl+Shift+Z"
            disabled={state.future.length === 0}
            onClick={() => dispatch({ type: 'redo' })}
          >
            Redo
          </button>
          <button
            type="button"
            className={quietButton}
            onClick={() => navigate('/app/dashboard/puzzles/library')}
          >
            Library
          </button>
          <Button size="sm" type="button" disabled={publishBusy || scriptureMissing} title={scriptureMissing ? 'Every word needs a scripture reference' : undefined} onClick={() => void publishStaged()}>
            {publishBusy ? 'Publishing…' : 'Publish'}
          </Button>
        </div>
      </div>

      {openError ? <Alert kind="error">{openError}</Alert> : null}
      {publishError ? <Alert kind="error">{publishError}</Alert> : null}

      {conflict ? (
        <div
          className="border border-error bg-error-bg/30 rounded-card p-4 flex flex-col gap-2"
          role="alertdialog"
          aria-labelledby="studio-conflict-title"
        >
          <h3 id="studio-conflict-title" className="text-sm font-bold text-error">
            Version conflict
          </h3>
          <p className="text-xs text-muted">
            Server is at v{conflict.serverVersion}; this tab is at v{conflict.localVersion}. Reload
            theirs or keep mine.
          </p>
          <div className="flex gap-2 flex-wrap mt-1">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg border border-border bg-cream hover:bg-surface-2 text-xs font-semibold text-navy transition-colors cursor-pointer"
              onClick={reloadTheirs}
            >
              Reload theirs
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg border border-border bg-cream hover:bg-surface-2 text-xs font-semibold text-navy transition-colors cursor-pointer"
              onClick={() => void keepMine()}
            >
              Keep mine
            </button>
          </div>
        </div>
      ) : null}

      <IssuesPanel doc={state.present} onLocate={locateIssue} />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <aside className="lg:col-span-4">
          <WordListEditor
            steps={state.present.data.steps}
            selectedId={state.selectedStepId}
            onSelect={(id) => dispatch({ type: 'select', id })}
            onChange={(id, patch) => dispatch({ type: 'updateStep', id, patch })}
            onAdd={addStep}
            onRemove={(id) => dispatch({ type: 'removeStep', id })}
          />
        </aside>

        <main className="lg:col-span-8">
          <PuzzleCanvas
            steps={state.present.data.steps}
            selectedId={state.selectedStepId}
            highlightCell={highlight}
            onSelect={(id) => dispatch({ type: 'select', id })}
            onPlace={(id, row, col, fromLetter) =>
              dispatch({ type: 'placeStep', id, row, col, fromLetter })
            }
            onCommitPlacements={(updates) => {
              dispatch({ type: 'placeMany', updates });
            }}
            onAnswerChange={(id, answer) =>
              dispatch({ type: 'patchStep', id, patch: { answer } })
            }
            onStartWordAt={startWordAt}
          />
        </main>
      </div>
    </div>
  );
}
