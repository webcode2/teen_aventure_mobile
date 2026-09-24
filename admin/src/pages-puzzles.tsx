import { useCallback, useEffect, useReducer, useState } from 'react';
import { PageHeader, Alert, Spinner } from './ui';
import { api, ApiError } from './api';
import {
  emptyDoc,
  initialState,
  studioReducer,
  type StudioDoc,
  type StudioStep,
} from './studio/doc-store';
import { useDebouncedDraftAutosave } from './studio/use-debounced-autosave';
import { WordListEditor } from './studio/WordListEditor';
import { PuzzleCanvas } from './studio/PuzzleCanvas';
import { IssuesPanel } from './studio/IssuesPanel';

type DraftMeta = { id: string; title: string; version: number; updatedAt: string };

type StagedMeta = {
  id: string;
  puzzleId?: string;
  puzzleKey: string;
  version: number;
  status: string;
  title: string;
  solvedAt?: string | null;
};

type QuestWeek = {
  id: string;
  weekNumber: number;
  title: string;
  scripture?: string;
};

/** Persist week as `Week N` so publish + mobile can auto-link quest video/quiz. */
export function weekTitle(weekNumber: number): string {
  return `Week ${weekNumber}`;
}

export function parseWeekNumber(title: string): number | null {
  const m = /^Week\s+(\d+)\b/i.exec(title.trim()) || /^(\d+)$/.exec(title.trim());
  return m ? Number(m[1]) : null;
}

export function PuzzlesStudioPage() {
  const [state, dispatch] = useReducer(studioReducer, undefined, () => initialState());
  const [drafts, setDrafts] = useState<DraftMeta[]>([]);
  const [staged, setStaged] = useState<StagedMeta[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');
  const [highlight, setHighlight] = useState<{ row: number; col: number } | null>(null);
  const [publishError, setPublishError] = useState('');
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishVersion, setPublishVersion] = useState<number | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [questWeeks, setQuestWeeks] = useState<QuestWeek[]>([]);

  const refreshDrafts = useCallback((opts?: { quiet?: boolean }) => {
    const quiet = opts?.quiet ?? false;
    if (!quiet) setLoadingList(true);
    Promise.all([
      api<DraftMeta[]>('/api/puzzle-drafts'),
      api<{ versions: StagedMeta[] }>('/api/puzzles').catch(() => ({ versions: [] as StagedMeta[] })),
    ])
      .then(([d, p]) => {
        setListError('');
        setDrafts(d);
        setStaged(p.versions.filter((v) => v.status === 'STAGED' || v.status === 'LIVE'));
      })
      .catch((e: Error) => {
        // Keep prior list; only surface error when the library panel is open.
        setListError(e.message);
      })
      .finally(() => {
        if (!quiet) setLoadingList(false);
      });
  }, []);

  useEffect(() => {
    // Initial load only — quiet thereafter so failed polls never flash the canvas.
    refreshDrafts({ quiet: false });
  }, [refreshDrafts]);

  useEffect(() => {
    api<QuestWeek[]>('/api/teen-quest/weeks')
      .then(setQuestWeeks)
      .catch(() => setQuestWeeks([]));
  }, []);

  const onDraftId = useCallback((id: string) => {
    dispatch({ type: 'setDraftId', id });
    // Refresh library quietly later — avoid flashing the main canvas.
    window.setTimeout(() => refreshDrafts({ quiet: true }), 2000);
  }, [refreshDrafts]);

  const { status: saveStatus, error: saveError, conflict, clearConflict } = useDebouncedDraftAutosave({
    draftId: state.draftId,
    version: state.version,
    doc: state.present,
    onDraftId,
  });

  const selectedWeek = parseWeekNumber(state.present.title);
  const linkedWeek = questWeeks.find((w) => w.weekNumber === selectedWeek) ?? null;

  function setWeekNumber(weekNumber: number) {
    const week = questWeeks.find((w) => w.weekNumber === weekNumber);
    dispatch({
      type: 'setMeta',
      title: weekTitle(weekNumber),
      // Prefer the quest week's scripture when linking a new week.
      scripture: week?.scripture?.trim() || state.present.scripture,
    });
  }

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
    // Reuse selected empty unplaced word if present; otherwise create one.
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

  async function openDraft(id: string) {
    try {
      const row = await api<{ id: string; version: number; doc: StudioDoc }>(
        `/api/puzzle-drafts/${id}`,
      );
      dispatch({
        type: 'replace',
        doc: row.doc,
        draftId: row.id,
        version: row.version,
      });
      setPublishVersion(null);
      clearConflict();
      setShowLibrary(false);
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to open draft');
    }
  }

  function newDraft() {
    dispatch({ type: 'replace', doc: emptyDoc(), draftId: null, version: 1 });
    setPublishVersion(null);
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
      setListError(e instanceof Error ? e.message : 'Keep mine failed');
    }
  }

  async function publishStaged() {
    setPublishBusy(true);
    setPublishError('');
    const version = publishVersion ?? state.version;
    setPublishVersion(version);
    try {
      await api('/api/puzzles/publish', {
        method: 'POST',
        body: JSON.stringify({
          draftId: state.draftId ?? undefined,
          doc: state.draftId ? undefined : state.present,
          version,
          title: state.present.title,
        }),
      });
      setPublishVersion(null);
      refreshDrafts({ quiet: true });
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

  async function promote(id: string) {
    try {
      await api(`/api/puzzles/versions/${id}/promote`, { method: 'POST', body: '{}' });
      refreshDrafts({ quiet: true });
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Promote failed');
    }
  }

  const saveStatusTone: Record<string, string> = {
    idle: 'text-muted',
    saving: 'text-orange',
    saved: 'text-forest',
    error: 'text-error',
    conflict: 'text-error',
  };

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

  return (
    <div className="flex flex-col gap-4 pb-16">
      <PageHeader
        title="Puzzle Studio"
        subtitle="Link each puzzle to a Teen Quest week — teens get that week’s video, quiz, and this grid together."
      />

      <div className="flex flex-wrap items-center gap-2 p-3 rounded-card border border-border bg-surface shadow-xs">
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg border border-border bg-cream hover:bg-surface-2 text-xs font-semibold text-navy transition-colors cursor-pointer"
          onClick={newDraft}
        >
          New puzzle
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg border border-border bg-cream hover:bg-surface-2 text-xs font-semibold text-navy transition-colors cursor-pointer disabled:opacity-50"
          disabled={state.past.length === 0}
          onClick={() => dispatch({ type: 'undo' })}
        >
          Undo
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg border border-border bg-cream hover:bg-surface-2 text-xs font-semibold text-navy transition-colors cursor-pointer disabled:opacity-50"
          disabled={state.future.length === 0}
          onClick={() => dispatch({ type: 'redo' })}
        >
          Redo
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-navy hover:bg-teal text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          disabled={publishBusy}
          onClick={() => void publishStaged()}
        >
          {publishBusy ? 'Publishing…' : 'Publish'}
        </button>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg border border-border bg-cream hover:bg-surface-2 text-xs font-semibold text-navy transition-colors cursor-pointer"
          onClick={() => {
            setShowLibrary((v) => !v);
            if (!showLibrary) refreshDrafts({ quiet: true });
          }}
        >
          {showLibrary ? 'Hide drafts' : 'Drafts & published'}
        </button>
        {publishError && <Alert kind="error">{publishError}</Alert>}
      </div>

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

      {showLibrary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="bg-surface border border-border rounded-card p-4 shadow-xs flex flex-col gap-3">
            <h3 className="text-sm font-bold text-navy m-0">Drafts</h3>
            {loadingList ? (
              <Spinner />
            ) : listError ? (
              <Alert kind="error">{listError}</Alert>
            ) : drafts.length === 0 ? (
              <p className="text-xs text-muted m-0">No drafts yet — edits autosave here.</p>
            ) : (
              <ul className="flex flex-col gap-2 list-none p-0 m-0">
                {drafts.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      className="w-full text-left p-2.5 rounded-lg border border-border bg-cream hover:border-teal transition-all flex flex-col gap-0.5 cursor-pointer"
                      onClick={() => void openDraft(d.id)}
                    >
                      <strong className="text-xs font-bold text-navy">{d.title}</strong>
                      <span className="text-[11px] text-muted">
                        v{d.version} · {new Date(d.updatedAt).toLocaleString()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="bg-surface border border-border rounded-card p-4 shadow-xs flex flex-col gap-3">
            <h3 className="text-sm font-bold text-navy m-0">Published</h3>
            {staged.length === 0 ? (
              <p className="text-xs text-muted m-0">No staged/live versions yet.</p>
            ) : (
              <ul className="flex flex-col gap-2 list-none p-0 m-0">
                {staged.map((v) => (
                  <li
                    key={v.id}
                    className="p-2.5 rounded-lg border border-border bg-cream flex flex-col gap-1.5"
                  >
                    <div>
                      <strong className="text-xs font-bold text-navy block">
                        {v.title} · {v.status}
                      </strong>
                      <span className="text-[11px] text-muted">
                        pub v{v.version}
                        {v.solvedAt ? ' · reviewed' : ''}
                      </span>
                    </div>
                    {v.status === 'STAGED' ? (
                      <button
                        type="button"
                        className="self-start px-2 py-1 rounded-md text-xs font-semibold bg-navy hover:bg-teal text-white transition-colors cursor-pointer"
                        onClick={() => void promote(v.id)}
                      >
                        Promote to live
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      <div className="bg-surface border border-border rounded-card p-3 shadow-xs max-w-md">
        <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
          Week number
          <select
            value={selectedWeek ?? ''}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n > 0) setWeekNumber(n);
            }}
            aria-label="Week number"
            className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-sm font-normal text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
          >
            <option value="" disabled>
              Select a Teen Quest week…
            </option>
            {questWeeks.length > 0
              ? questWeeks.map((w) => (
                  <option key={w.id} value={w.weekNumber}>
                    Week {w.weekNumber} — {w.title}
                  </option>
                ))
              : Array.from({ length: 52 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    Week {n}
                  </option>
                ))}
          </select>
          <span className="text-[11px] font-normal text-muted">
            {linkedWeek
              ? `Links to quest video & quiz for “${linkedWeek.title}”.`
              : selectedWeek
                ? `Will link to Week ${selectedWeek} video & quiz when that quest is published.`
                : 'Required — every puzzle belongs to one weekly adventure.'}
          </span>
        </label>
      </div>

      {/* Large: Words | Grid | Checklist — stack on smaller screens */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <aside className="lg:col-span-3 flex flex-col gap-3 order-2 lg:order-1">
          <WordListEditor
            steps={state.present.data.steps}
            selectedId={state.selectedStepId}
            onSelect={(id) => dispatch({ type: 'select', id })}
            onChange={(id, patch) => dispatch({ type: 'updateStep', id, patch })}
            onAdd={addStep}
            onRemove={(id) => dispatch({ type: 'removeStep', id })}
          />
        </aside>

        <main className="lg:col-span-6 flex flex-col gap-3 order-1 lg:order-2">
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

        <aside className="lg:col-span-3 flex flex-col gap-3 order-3">
          <IssuesPanel doc={state.present} onLocate={locateIssue} />
        </aside>
      </div>

      {/* Save status — pinned to bottom of the studio page */}
      <div
        className="sticky bottom-0 z-10 -mx-1 mt-2 px-3 py-2.5 rounded-card border border-border bg-surface/95 backdrop-blur-sm shadow-xs flex flex-wrap items-center gap-3"
        role="status"
        aria-live="polite"
      >
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-2 border border-border/60 ${saveStatusTone[saveStatus] || 'text-muted'}`}
          data-status={saveStatus}
          title={saveError ?? undefined}
        >
          v{state.version} · {saveStatus === 'error' ? 'offline' : saveStatus}
        </span>
        <span className="text-[11px] text-muted">
          {selectedWeek ? weekTitle(selectedWeek) : 'No week selected'}
          {state.draftId ? ' · draft autosaving' : ' · new draft'}
        </span>
        {saveError && saveStatus === 'error' ? (
          <span className="text-[11px] text-error ml-auto">{saveError}</span>
        ) : null}
      </div>
    </div>
  );
}
