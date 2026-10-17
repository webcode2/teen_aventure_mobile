import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { prepareMatchingPublish, type MatchingEnvelope } from '@askhub/puzzle-contracts';
import { api } from './api';
import { MatchingLibraryPage } from './pages-matching-library';
import { Alert, Button, Empty, Spinner } from './ui';

type StudioTab = 'new' | 'drafts' | 'live';

type MatchingVersionRow = {
  id: string;
  matchingId?: string;
  matchingKey: string;
  version: number;
  status: string;
  title: string;
  updatedAt?: string;
  liveAt?: string | null;
  stagedAt?: string;
};

type DraftRow = {
  id: string;
  matchingKey?: string;
  title: string;
  version: number;
  updatedAt: string;
};

function blankDoc(): MatchingEnvelope {
  return {
    schemaVersion: 1,
    id: `match-${crypto.randomUUID().slice(0, 8)}`,
    title: 'Untitled match',
    scripture: '',
    rewards: { points: 3 },
    type: 'MATCHING',
    data: {
      prompt: 'Draw a line from each word on the left to its match on the right.',
      ref: '',
      leftColumn: ['', ''],
      rightColumn: ['', ''],
      correctPairs: [
        { left: 0, right: 0 },
        { left: 1, right: 1 },
      ],
    },
  };
}

function syncPairs(leftLen: number, rightLen: number, pairs: Array<{ left: number; right: number }>) {
  const next = pairs
    .filter((p) => p.left < leftLen && p.right < rightLen)
    .slice(0, Math.min(leftLen, rightLen));
  while (next.length < Math.min(leftLen, rightLen)) {
    const left = next.length;
    const used = new Set(next.map((p) => p.right));
    let right = 0;
    while (used.has(right) && right < rightLen) right += 1;
    next.push({ left, right: Math.min(right, rightLen - 1) });
  }
  return next.map((p, i) => ({ left: i, right: p.right }));
}

export function MatchingStudioPage() {
  const [searchParams] = useSearchParams();
  const editMatching = searchParams.get('editMatching');
  const openVersionId = searchParams.get('version');
  const startNew = searchParams.get('new') === '1';
  const tabParam = searchParams.get('tab');
  const openedMatching = useRef<string | null>(null);
  const openedVersion = useRef<string | null>(null);
  const startedNew = useRef(false);

  const [tab, setTab] = useState<StudioTab>(() => {
    if (tabParam === 'drafts' || tabParam === 'live') return tabParam;
    return 'new';
  });
  const [doc, setDoc] = useState<MatchingEnvelope>(() => blankDoc());
  const [draftId, setDraftId] = useState<string | null>(null);
  const [version, setVersion] = useState(1);
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  type DragSource =
    | { kind: 'left'; index: number }
    | { kind: 'right'; index: number }
    | { kind: 'pair'; left: number };
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [dropTarget, setDropTarget] = useState<DragSource | null>(null);

  const loadDrafts = useCallback(async (force = false) => {
    if (draftsLoaded && !force) return;
    setDraftsLoading(true);
    setError('');
    try {
      const draftRows = await api<DraftRow[]>('/api/matching-drafts');
      setDrafts(draftRows);
      setDraftsLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load drafts');
    } finally {
      setDraftsLoading(false);
    }
  }, [draftsLoaded]);

  useEffect(() => {
    if (tab === 'drafts') void loadDrafts();
  }, [tab, loadDrafts]);

  const preview = useMemo(() => {
    const left = doc.data.leftColumn;
    const right = doc.data.rightColumn;
    return { left, right, pairs: doc.data.correctPairs };
  }, [doc]);

  function updateColumn(side: 'leftColumn' | 'rightColumn', index: number, value: string) {
    setDoc((prev) => {
      const column = [...prev.data[side]];
      column[index] = value;
      const leftColumn = side === 'leftColumn' ? column : prev.data.leftColumn;
      const rightColumn = side === 'rightColumn' ? column : prev.data.rightColumn;
      return {
        ...prev,
        data: {
          ...prev.data,
          leftColumn,
          rightColumn,
          correctPairs: syncPairs(leftColumn.length, rightColumn.length, prev.data.correctPairs),
        },
      };
    });
    setVersion((v) => v + 1);
  }

  function addPairRow() {
    setDoc((prev) => {
      const leftColumn = [...prev.data.leftColumn, ''];
      const rightColumn = [...prev.data.rightColumn, ''];
      return {
        ...prev,
        data: {
          ...prev.data,
          leftColumn,
          rightColumn,
          correctPairs: syncPairs(leftColumn.length, rightColumn.length, prev.data.correctPairs),
        },
      };
    });
    setVersion((v) => v + 1);
  }

  /** Swap which right answers are paired with two left rows (correct-pairs DnD). */
  function swapPairRights(leftA: number, leftB: number) {
    if (leftA === leftB) return;
    setDoc((prev) => {
      const a = prev.data.correctPairs.find((p) => p.left === leftA);
      const b = prev.data.correctPairs.find((p) => p.left === leftB);
      if (!a || !b) return prev;
      const correctPairs = prev.data.correctPairs.map((p) => {
        if (p.left === leftA) return { left: leftA, right: b.right };
        if (p.left === leftB) return { left: leftB, right: a.right };
        return p;
      });
      return { ...prev, data: { ...prev.data, correctPairs } };
    });
    setVersion((v) => v + 1);
  }

  /**
   * Swap two slots in Left or Right. Left swaps keep each word’s answer;
   * Right swaps remap pair indices so answers stay with the same left words.
   */
  function swapColumnSlots(side: 'leftColumn' | 'rightColumn', a: number, b: number) {
    if (a === b || a < 0 || b < 0) return;
    setDoc((prev) => {
      const len = prev.data[side].length;
      if (a >= len || b >= len) return prev;
      const column = [...prev.data[side]];
      const tmp = column[a]!;
      column[a] = column[b]!;
      column[b] = tmp;

      let correctPairs = prev.data.correctPairs;
      if (side === 'leftColumn') {
        const pa = correctPairs.find((p) => p.left === a);
        const pb = correctPairs.find((p) => p.left === b);
        if (pa && pb) {
          correctPairs = correctPairs.map((p) => {
            if (p.left === a) return { left: a, right: pb.right };
            if (p.left === b) return { left: b, right: pa.right };
            return p;
          });
        }
      } else {
        correctPairs = correctPairs.map((p) => {
          if (p.right === a) return { ...p, right: b };
          if (p.right === b) return { ...p, right: a };
          return p;
        });
      }

      return {
        ...prev,
        data: {
          ...prev.data,
          leftColumn: side === 'leftColumn' ? column : prev.data.leftColumn,
          rightColumn: side === 'rightColumn' ? column : prev.data.rightColumn,
          correctPairs,
        },
      };
    });
    setVersion((v) => v + 1);
  }

  function clearDrag() {
    setDragSource(null);
    setDropTarget(null);
  }

  function columnRowClass(active: boolean, over: boolean) {
    return `flex items-stretch gap-1 rounded-none border bg-cream ${
      active
        ? 'opacity-50 border-teal'
        : over
          ? 'border-navy ring-2 ring-navy/20'
          : 'border-border'
    }`;
  }

  async function saveDraft() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const row = await api<{ id: string; version: number }>('/api/matching-drafts', {
        method: 'PUT',
        body: JSON.stringify({
          id: draftId ?? undefined,
          title: doc.title,
          version,
          doc,
        }),
      });
      setDraftId(row.id);
      setVersion(row.version);
      setMessage('Draft saved');
      setDraftsLoaded(false);
      if (tab === 'drafts') await loadDrafts(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function publishAndPromote() {
    setBusy(true);
    setError('');
    setMessage('');
    const prepared = prepareMatchingPublish(doc);
    if (!prepared.ok) {
      setError(prepared.issues.map((i) => i.message).join('; '));
      setBusy(false);
      return;
    }
    try {
      // Best-effort draft save — publish must not depend on it.
      let savedDraftId = draftId;
      try {
        const row = await api<{ id: string; version: number }>('/api/matching-drafts', {
          method: 'PUT',
          body: JSON.stringify({
            id: draftId ?? undefined,
            title: doc.title,
            version,
            doc: prepared.canonical,
          }),
        });
        savedDraftId = row.id;
        setDraftId(row.id);
        setVersion(row.version);
      } catch {
        // Keep going with the in-memory doc.
      }

      const matchingKey = prepared.canonical.id;
      const catalogue = await api<{ versions: MatchingVersionRow[] }>('/api/matchings');
      const nextPubVersion =
        (catalogue.versions ?? [])
          .filter((v) => v.matchingKey === matchingKey)
          .reduce((max, v) => Math.max(max, v.version), 0) + 1;

      const published = await api<{
        matching: { id: string };
        version: { id: string };
      }>('/api/matchings/publish', {
        method: 'POST',
        body: JSON.stringify({
          doc: prepared.canonical,
          version: nextPubVersion,
          title: doc.title,
        }),
      });
      await api(`/api/matchings/versions/${published.version.id}/promote`, { method: 'POST' });

      // Always drop WIP drafts for this match once it is LIVE.
      setDraftId(null);
      try {
        const draftRows = await api<DraftRow[]>('/api/matching-drafts');
        const toRemove = draftRows.filter(
          (d) => d.id === savedDraftId || d.matchingKey === matchingKey,
        );
        await Promise.all(
          toRemove.map((d) =>
            api(`/api/matching-drafts/${d.id}`, { method: 'DELETE' }).catch(() => null),
          ),
        );
      } catch {
        if (savedDraftId) {
          await api(`/api/matching-drafts/${savedDraftId}`, { method: 'DELETE' }).catch(() => null);
        }
      }

      setMessage('Published and promoted to LIVE');
      setDraftsLoaded(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setBusy(false);
    }
  }

  async function openDraft(id: string) {
    setBusy(true);
    setError('');
    try {
      const row = await api<{ id: string; version: number; doc: MatchingEnvelope }>(
        `/api/matching-drafts/${id}`,
      );
      setDraftId(row.id);
      setVersion(row.version);
      setDoc(row.doc);
      setTab('new');
      setMessage(`Opened draft “${row.doc.title}”`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open draft');
    } finally {
      setBusy(false);
    }
  }

  function newMatch() {
    setDraftId(null);
    setVersion(1);
    setDoc(blankDoc());
    setTab('new');
    setMessage('New match game');
  }

  async function openLiveMatching(matchingId: string) {
    setBusy(true);
    setError('');
    try {
      const row = await api<{ id: string; version: number; title: string; doc: MatchingEnvelope }>(
        `/api/matchings/id/${matchingId}/live`,
      );
      setDraftId(null);
      setVersion(1);
      setDoc(row.doc);
      setTab('new');
      setMessage(`Opened LIVE “${row.title || row.doc.title}” for update`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open LIVE match');
    } finally {
      setBusy(false);
    }
  }

  async function openPublishedVersion(versionId: string) {
    setBusy(true);
    setError('');
    try {
      const row = await api<{ id: string; version: number; title: string; doc: MatchingEnvelope }>(
        `/api/matchings/versions/${versionId}`,
      );
      setDraftId(null);
      setVersion(1);
      setDoc(row.doc);
      setTab('new');
      setMessage(`Opened “${row.title || row.doc.title}” for update`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open match');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!startNew || editMatching || openVersionId || startedNew.current) return;
    startedNew.current = true;
    newMatch();
  }, [startNew, editMatching, openVersionId]);

  useEffect(() => {
    if (!editMatching || openedMatching.current === editMatching) return;
    openedMatching.current = editMatching;
    void openLiveMatching(editMatching);
  }, [editMatching]);

  useEffect(() => {
    if (!openVersionId || openedVersion.current === openVersionId) return;
    openedVersion.current = openVersionId;
    void openPublishedVersion(openVersionId);
  }, [openVersionId]);

  const studioTabs: Array<{ id: StudioTab; label: string }> = [
    { id: 'new', label: 'New' },
    { id: 'drafts', label: 'Drafts' },
    { id: 'live', label: 'Live catalogue' },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-16">
      <div>
        <p className="m-0 text-[10px] font-bold uppercase tracking-wider text-muted">Match Studio</p>
        <h1 className="m-0 text-2xl font-bold text-navy tracking-tight">Pair / line match</h1>
        <p className="m-0 mt-1 text-sm text-muted">
          Author left and right columns. Flutter draws the connectors from studio data.
        </p>
      </div>

      <div
        className="flex w-full justify-end border-b border-border"
        role="tablist"
        aria-label="Match Studio sections"
      >
        {studioTabs.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`-mb-px cursor-pointer border-0 border-b-2 bg-transparent px-3 pb-2.5 pt-1 text-sm font-medium transition-colors ${
                active
                  ? 'border-teal text-teal'
                  : 'border-transparent text-muted hover:text-navy'
              }`}
              onClick={() => {
                setError('');
                setTab(item.id);
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {message ? <Alert kind="ok">{message}</Alert> : null}
      {error ? <Alert kind="error">{error}</Alert> : null}

      {tab === 'drafts' ? (
        <section className="flex flex-col gap-3">
          <p className="m-0 text-xs text-muted">
            Saved work in progress. Open a draft to continue editing in the New tab.
          </p>
          {draftsLoading ? (
            <Spinner label="Loading drafts…" />
          ) : drafts.length === 0 ? (
            <Empty title="No drafts" body="Save from the New tab to keep WIP here." />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {drafts.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void openDraft(d.id)}
                    className="w-full cursor-pointer rounded-none border border-border bg-surface px-4 py-3 text-left text-sm hover:bg-cream disabled:opacity-50"
                  >
                    <strong className="text-navy">{d.title}</strong>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      v{d.version}
                      {d.updatedAt ? ` · Updated ${new Date(d.updatedAt).toLocaleString()}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === 'live' ? <MatchingLibraryPage embedded /> : null}

      {tab === 'new' ? (
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col gap-4 rounded-none border border-border bg-surface p-5">
          <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
            Title
            <input
              className="rounded-none border border-border bg-cream px-3 py-2 text-sm font-normal"
              value={doc.title}
              onChange={(e) => {
                setDoc((d) => ({ ...d, title: e.target.value }));
                setVersion((v) => v + 1);
              }}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
              Scripture
              <input
                className="rounded-none border border-border bg-cream px-3 py-2 text-sm font-normal"
                value={doc.scripture}
                onChange={(e) => {
                  setDoc((d) => ({ ...d, scripture: e.target.value }));
                  setVersion((v) => v + 1);
                }}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
              Ref
              <input
                className="rounded-none border border-border bg-cream px-3 py-2 text-sm font-normal"
                value={doc.data.ref}
                onChange={(e) => {
                  setDoc((d) => ({ ...d, data: { ...d.data, ref: e.target.value } }));
                  setVersion((v) => v + 1);
                }}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs font-semibold text-navy">
            Prompt
            <textarea
              rows={2}
              className="rounded-none border border-border bg-cream px-3 py-2 text-sm font-normal"
              value={doc.data.prompt}
              onChange={(e) => {
                setDoc((d) => ({ ...d, data: { ...d.data, prompt: e.target.value } }));
                setVersion((v) => v + 1);
              }}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                { side: 'leftColumn' as const, kind: 'left' as const, label: 'Left', words: doc.data.leftColumn },
                { side: 'rightColumn' as const, kind: 'right' as const, label: 'Right', words: doc.data.rightColumn },
              ] as const
            ).map((col) => (
              <div key={col.side} className="flex flex-col gap-2">
                <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-muted">{col.label}</p>
                <p className="m-0 text-[11px] text-muted">Drag ⋮⋮ to rearrange layout.</p>
                {col.words.map((word, i) => {
                  const active =
                    dragSource?.kind === col.kind && dragSource.index === i;
                  const over =
                    dropTarget?.kind === col.kind &&
                    dropTarget.index === i &&
                    dragSource?.kind === col.kind &&
                    dragSource.index !== i;
                  return (
                    <div
                      key={`${col.kind}${i}`}
                      className={columnRowClass(active, over)}
                      onDragOver={(e) => {
                        if (dragSource?.kind !== col.kind) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (!over) setDropTarget({ kind: col.kind, index: i });
                      }}
                      onDragLeave={() => {
                        if (dropTarget?.kind === col.kind && dropTarget.index === i) {
                          setDropTarget(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragSource?.kind !== col.kind) {
                          clearDrag();
                          return;
                        }
                        const from = dragSource.index;
                        clearDrag();
                        swapColumnSlots(col.side, from, i);
                      }}
                    >
                      <button
                        type="button"
                        draggable
                        aria-label={`Drag to rearrange ${col.label} ${i + 1}`}
                        title="Drag to swap"
                        onDragStart={(e) => {
                          setDragSource({ kind: col.kind, index: i });
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', `${col.kind}:${i}`);
                        }}
                        onDragEnd={clearDrag}
                        className="cursor-grab border-0 bg-transparent px-2 text-muted active:cursor-grabbing"
                      >
                        ⋮⋮
                      </button>
                      <input
                        className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm underline decoration-navy/40 outline-none"
                        value={word}
                        placeholder={`${col.label} ${i + 1}`}
                        onChange={(e) => updateColumn(col.side, i, e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-muted">Correct pairs</p>
            <p className="m-0 text-[11px] text-muted">
              Drag a right answer onto another to swap which left it matches.
            </p>
            {doc.data.correctPairs.map((pair) => {
              const rightLabel = doc.data.rightColumn[pair.right] || `Right ${pair.right + 1}`;
              const dragging = dragSource?.kind === 'pair' && dragSource.left === pair.left;
              const dropOver =
                dropTarget?.kind === 'pair' &&
                dropTarget.left === pair.left &&
                dragSource?.kind === 'pair' &&
                dragSource.left !== pair.left;
              return (
                <div key={pair.left} className="flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate font-semibold text-navy">
                    {doc.data.leftColumn[pair.left] || `Left ${pair.left + 1}`}
                  </span>
                  <span className="text-muted">→</span>
                  <button
                    type="button"
                    draggable
                    aria-label={`Drag to swap: ${rightLabel}`}
                    onDragStart={(e) => {
                      setDragSource({ kind: 'pair', left: pair.left });
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', `pair:${pair.left}`);
                    }}
                    onDragEnd={clearDrag}
                    onDragOver={(e) => {
                      if (dragSource?.kind !== 'pair') return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (!dropOver) setDropTarget({ kind: 'pair', left: pair.left });
                    }}
                    onDragLeave={() => {
                      if (dropTarget?.kind === 'pair' && dropTarget.left === pair.left) {
                        setDropTarget(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragSource?.kind !== 'pair') {
                        clearDrag();
                        return;
                      }
                      const from = dragSource.left;
                      clearDrag();
                      swapPairRights(from, pair.left);
                    }}
                    className={`min-w-0 flex-1 cursor-grab rounded-none border bg-cream px-2 py-1.5 text-left font-semibold text-navy active:cursor-grabbing ${
                      dragging
                        ? 'opacity-50 border-teal'
                        : dropOver
                          ? 'border-navy bg-teal-tint ring-2 ring-navy/20'
                          : 'border-border hover:border-navy/40'
                    }`}
                  >
                    {rightLabel}
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={addPairRow}
              className="mt-1 w-fit cursor-pointer rounded-none border border-border bg-cream px-3 py-1 text-xs font-semibold text-navy"
            >
              + Add row
            </button>
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <section className="rounded-none border border-border bg-surface p-5">
            <p className="m-0 text-[11px] font-bold uppercase tracking-wider text-muted">Preview</p>
            <p className="m-0 mt-1 text-xs text-muted">{doc.data.prompt}</p>
            <div className="relative mt-4 grid grid-cols-[1fr_1.2rem_1fr] gap-x-2">
              <div className="flex flex-col gap-3">
                {preview.left.map((word, i) => (
                  <div
                    key={`pl${i}`}
                    className="rounded-none border border-border bg-cream px-2 py-2 text-center text-xs font-semibold text-navy underline"
                  >
                    {word || '—'}
                  </div>
                ))}
              </div>
              <svg className="h-full w-full overflow-visible" viewBox="0 0 20 100" preserveAspectRatio="none" aria-hidden>
                {preview.pairs.map((pair) => {
                  const y1 = ((pair.left + 0.5) / Math.max(preview.left.length, 1)) * 100;
                  const y2 = ((pair.right + 0.5) / Math.max(preview.right.length, 1)) * 100;
                  return (
                    <line
                      key={`${pair.left}-${pair.right}`}
                      x1="2"
                      y1={y1}
                      x2="18"
                      y2={y2}
                      stroke="#c23b22"
                      strokeWidth="2.5"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>
              <div className="flex flex-col gap-3">
                {preview.right.map((word, i) => (
                  <div
                    key={`pr${i}`}
                    className="rounded-none border border-border bg-cream px-2 py-2 text-center text-xs font-semibold text-navy underline"
                  >
                    {word || '—'}
                  </div>
                ))}
              </div>
            </div>
          </section>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void saveDraft()}>
              Save draft
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={() => void publishAndPromote()}>
              Publish + LIVE
            </Button>
          </div>
        </div>
      </div>
      ) : null}
    </div>
  );
}
