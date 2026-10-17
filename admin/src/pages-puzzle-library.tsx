import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { api } from './api';
import { askConfirm } from './prompt-dialog';
import { Alert, Button, Badge, Empty, Spinner } from './ui';

type DraftRow = {
  id: string;
  title: string;
  version: number;
  updatedAt: string;
  puzzleKey?: string;
};

type PublishedRow = {
  id: string;
  puzzleId?: string;
  puzzleKey: string;
  version: number;
  status: string;
  title: string;
  solvedAt?: string | null;
  attachedWeekNumber?: number | null;
  canDelete?: boolean;
  stagedAt?: string;
  updatedAt?: string;
};

type KindFilter = 'all' | 'draft' | 'published';
type StatusFilter = 'all' | 'LIVE' | 'STAGED';
type QuestFilter = 'all' | 'attached' | 'free';

type LibraryRow =
  | {
      key: string;
      kind: 'draft';
      title: string;
      status: 'DRAFT';
      version: number;
      questWeek: number | null;
      updatedAt: string;
      canDelete: boolean;
      draft: DraftRow;
    }
  | {
      key: string;
      kind: 'published';
      title: string;
      status: 'LIVE' | 'STAGED';
      version: number;
      questWeek: number | null;
      updatedAt: string;
      canDelete: boolean;
      published: PublishedRow;
    };

function initials(title: string) {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function TitleAvatar({ title }: { title: string }) {
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-bold tracking-tight text-gold"
      aria-hidden
    >
      {initials(title)}
    </span>
  );
}

function DataTableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto bg-transparent">
      <table className="w-full min-w-[720px] border-collapse text-left text-xs">{children}</table>
    </div>
  );
}

const thClass =
  'whitespace-nowrap border-b border-border px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted first:pl-0 last:pr-0';
const tdClass = 'px-3 py-3 align-middle text-navy first:pl-0 last:pr-0';

function rowClass(selected: boolean) {
  return `border-b border-border/50 cursor-pointer transition-colors hover:bg-surface-2/30 ${
    selected ? 'bg-teal-tint/50' : ''
  }`;
}

const filterSelectClass =
  'rounded-none border border-border bg-surface px-3 py-2 text-xs font-semibold text-navy focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25';

const PAGE_SIZE = 12;
const pageBtnClass =
  'rounded-none border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-navy cursor-pointer disabled:opacity-40';

/** Keep LIVE + latest STAGED per puzzle so staged orphans stay visible. */
function collapsePublished(versions: PublishedRow[]): PublishedRow[] {
  const byPuzzle = new Map<string, { live?: PublishedRow; staged?: PublishedRow }>();
  for (const v of versions) {
    const key = v.puzzleId || v.puzzleKey || v.id;
    const slot = byPuzzle.get(key) ?? {};
    if (v.status === 'LIVE') {
      if (!slot.live || v.version > slot.live.version) slot.live = v;
    } else if (v.status === 'STAGED') {
      if (!slot.staged || v.version > slot.staged.version) slot.staged = v;
    }
    byPuzzle.set(key, slot);
  }
  const out: PublishedRow[] = [];
  for (const slot of byPuzzle.values()) {
    if (slot.live) out.push(slot.live);
    if (slot.staged) out.push(slot.staged);
  }
  return out;
}

export function PuzzleLibraryPage() {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [published, setPublished] = useState<PublishedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const [kind, setKind] = useState<KindFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [quest, setQuest] = useState<QuestFilter>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback((opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    Promise.all([
      api<DraftRow[]>('/api/puzzle-drafts'),
      api<{ versions: PublishedRow[] }>('/api/puzzles').catch(() => ({ versions: [] as PublishedRow[] })),
    ])
      .then(([d, p]) => {
        setError('');
        setDrafts(d);
        setPublished(
          collapsePublished(
            (p.versions ?? []).filter((v) => v.status === 'STAGED' || v.status === 'LIVE'),
          ),
        );
      })
      .catch((e: Error) => setError(e.message || 'Failed to load library'))
      .finally(() => {
        if (!opts?.quiet) setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo((): LibraryRow[] => {
    const draftRows: LibraryRow[] = drafts.map((d) => ({
      key: `draft:${d.id}`,
      kind: 'draft',
      title: d.title,
      status: 'DRAFT',
      version: d.version,
      questWeek: null,
      updatedAt: d.updatedAt,
      canDelete: true,
      draft: d,
    }));
    const pubRows: LibraryRow[] = published.map((p) => ({
      key: `pub:${p.id}`,
      kind: 'published',
      title: p.title,
      status: p.status === 'LIVE' ? 'LIVE' : 'STAGED',
      version: p.version,
      questWeek: p.attachedWeekNumber ?? null,
      updatedAt: p.updatedAt || p.stagedAt || '',
      canDelete: p.canDelete !== false,
      published: p,
    }));
    return [...draftRows, ...pubRows].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [drafts, published]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind === 'draft' && r.kind !== 'draft') return false;
      if (kind === 'published' && r.kind !== 'published') return false;
      if (status !== 'all') {
        if (r.kind !== 'published' || r.status !== status) return false;
      }
      if (quest === 'attached' && r.questWeek == null) return false;
      if (quest === 'free' && r.questWeek != null) return false;
      if (needle && !r.title.toLowerCase().includes(needle) && !String(r.version).includes(needle)) {
        return false;
      }
      return true;
    });
  }, [rows, kind, status, quest, q]);

  useEffect(() => {
    setPage(1);
  }, [kind, status, quest, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  const draftCount = rows.filter((r) => r.kind === 'draft').length;
  const publishedCount = rows.filter((r) => r.kind === 'published').length;
  const filtersActive = kind !== 'all' || status !== 'all' || quest !== 'all' || q.trim() !== '';

  const tabs: Array<{ id: KindFilter; label: string; count: number }> = [
    { id: 'all', label: 'All', count: rows.length },
    { id: 'draft', label: 'Drafts', count: draftCount },
    { id: 'published', label: 'Published', count: publishedCount },
  ];

  function openRow(r: LibraryRow) {
    setSelectedKey(r.key);
    if (r.kind === 'draft') {
      navigate(`/app/dashboard/puzzles?draft=${encodeURIComponent(r.draft.id)}`);
      return;
    }
    if (r.published.puzzleId && r.status === 'LIVE') {
      navigate(`/app/dashboard/puzzles?editPuzzle=${encodeURIComponent(r.published.puzzleId)}`);
      return;
    }
    navigate(`/app/dashboard/puzzles?version=${encodeURIComponent(r.published.id)}`);
  }

  async function promote(r: LibraryRow) {
    if (r.kind !== 'published' || r.status !== 'STAGED') return;
    setBusyId(r.key);
    setActionError('');
    try {
      await api(`/api/puzzles/versions/${r.published.id}/promote`, { method: 'POST', body: '{}' });
      load({ quiet: true });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Promote failed');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteRow(r: LibraryRow) {
    if (!r.canDelete) {
      setActionError(
        r.questWeek != null
          ? `Cannot delete: attached to week ${r.questWeek}. Detach it from the quest first.`
          : 'Cannot delete this item.',
      );
      return;
    }
    const ok = await askConfirm(
      r.kind === 'draft'
        ? `Delete draft “${r.title}”?`
        : r.status === 'LIVE'
          ? `Delete LIVE “${r.title}”? This removes the published puzzle permanently.`
          : `Delete staged “${r.title}” (pub v${r.version})?`,
      {
        title: r.kind === 'draft' ? 'Delete draft' : r.status === 'LIVE' ? 'Delete LIVE puzzle' : 'Delete staged puzzle',
        confirmLabel: 'Delete',
        tone: 'danger',
      },
    );
    if (!ok) return;
    setBusyId(r.key);
    setActionError('');
    try {
      if (r.kind === 'draft') {
        await api(`/api/puzzle-drafts/${r.draft.id}`, { method: 'DELETE' });
      } else {
        await api(`/api/puzzles/versions/${r.published.id}`, { method: 'DELETE' });
      }
      if (selectedKey === r.key) setSelectedKey(null);
      load({ quiet: true });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  function statusBadge(r: LibraryRow) {
    if (r.status === 'LIVE') return <Badge kind="ok">LIVE</Badge>;
    if (r.status === 'STAGED') return <Badge kind="warn">STAGED</Badge>;
    return <Badge kind="info">Draft</Badge>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex flex-wrap items-center gap-0.5 bg-cream p-0.5"
          role="tablist"
          aria-label="Library sections"
        >
          {tabs.map((tab) => {
            const active = kind === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`cursor-pointer rounded-none px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  active ? 'bg-navy text-white' : 'text-muted hover:bg-surface hover:text-navy'
                }`}
                onClick={() => {
                  setKind(tab.id);
                  if (tab.id === 'draft') setStatus('all');
                  setPage(1);
                }}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex cursor-pointer items-center justify-center rounded-none border border-border bg-surface px-4 py-2 text-xs font-bold text-navy transition-colors hover:bg-cream"
            onClick={() => navigate('/app/dashboard/puzzles')}
          >
            Open studio
          </button>
          <Button type="button"
             
            onClick={() => navigate('/app/dashboard/puzzles?new=1')}
          >
            + New puzzle
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="relative min-w-[14rem] flex-1">
          <span className="sr-only">Search puzzles</span>
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or version…"
            aria-label="Search puzzles"
            className="w-full rounded-none border border-border bg-cream py-2.5 pl-10 pr-4 text-sm text-navy placeholder:text-muted/70 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25"
          />
        </label>

        <label className="flex min-w-[9rem] flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Status</span>
          <select
            className={filterSelectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            disabled={kind === 'draft'}
            aria-label="Filter by status"
          >
            <option value="all">All</option>
            <option value="LIVE">LIVE</option>
            <option value="STAGED">STAGED</option>
          </select>
        </label>

        <label className="flex min-w-[11rem] flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Quest</span>
          <select
            className={filterSelectClass}
            value={quest}
            onChange={(e) => setQuest(e.target.value as QuestFilter)}
            aria-label="Filter by quest attachment"
          >
            <option value="all">All</option>
            <option value="attached">Attached to a week</option>
            <option value="free">Not attached</option>
          </select>
        </label>

        {filtersActive ? (
          <button
            type="button"
            className="cursor-pointer rounded-none border border-border bg-cream px-3 py-2 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-navy"
            onClick={() => {
              setKind('all');
              setStatus('all');
              setQuest('all');
              setQ('');
            }}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <p className="m-0 text-xs text-muted">
        Select a row to open in Puzzle Studio
        {filtersActive
          ? ` · ${filtered.length} of ${rows.length} match`
          : filtered.length > 0
            ? ` · ${rangeStart}–${rangeEnd} of ${filtered.length}`
            : ''}
      </p>

      {error ? <Alert kind="error">{error}</Alert> : null}
      {actionError ? <Alert kind="error">{actionError}</Alert> : null}

      {loading ? (
        <Spinner label="Loading library…" />
      ) : filtered.length === 0 ? (
        <Empty
          title={rows.length === 0 ? 'Library is empty' : 'No matches'}
          body={
            rows.length === 0
              ? 'Open Puzzle Studio and start editing — drafts autosave here. Publish to add LIVE/STAGED rows.'
              : 'Try a different search or filter.'
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <DataTableShell>
            <thead>
              <tr>
                <th className={thClass}>Title</th>
                <th className={thClass}>Kind</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Version</th>
                <th className={thClass}>Quest week</th>
                <th className={thClass}>Updated</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => {
                const busy = busyId === r.key;
                return (
                  <tr
                    key={r.key}
                    className={rowClass(selectedKey === r.key)}
                    onClick={() => openRow(r)}
                  >
                    <td className={`${tdClass} font-semibold`}>
                      <div className="flex min-w-[10rem] items-center gap-2.5">
                        <TitleAvatar title={r.title} />
                        <span className="truncate">{r.title}</span>
                      </div>
                    </td>
                    <td className={`${tdClass} text-muted`}>
                      {r.kind === 'draft' ? 'Draft' : 'Published'}
                    </td>
                    <td className={tdClass}>{statusBadge(r)}</td>
                    <td className={`${tdClass} text-muted`}>
                      {r.kind === 'draft' ? `v${r.version}` : `pub v${r.version}`}
                    </td>
                    <td className={`${tdClass} text-muted`}>
                      {r.questWeek != null ? `Week ${r.questWeek}` : '—'}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-muted`}>
                      {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—'}
                    </td>
                    <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1.5">
                        {r.kind === 'published' && r.status === 'STAGED' ? (
                          <button
                            type="button"
                            disabled={busy}
                            className="cursor-pointer rounded-none border border-border bg-cream px-2.5 py-1 text-[11px] font-semibold text-navy hover:bg-surface-2 disabled:opacity-40"
                            onClick={() => void promote(r)}
                          >
                            Promote
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={busy || !r.canDelete}
                          title={
                            !r.canDelete && r.questWeek != null
                              ? `Attached to week ${r.questWeek}`
                              : undefined
                          }
                          className="cursor-pointer rounded-none border border-error/30 bg-error-bg/40 px-2.5 py-1 text-[11px] font-semibold text-error hover:bg-error-bg disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => void deleteRow(r)}
                        >
                          {busy ? '…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTableShell>

          {filtered.length > PAGE_SIZE ? (
            <div className="flex items-center justify-between gap-3 pt-1 text-xs text-muted">
              <span>
                {rangeStart}–{rangeEnd} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={pageBtnClass}
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`h-8 min-w-8 cursor-pointer rounded-none border text-xs font-semibold ${
                      pageNum === safePage
                        ? 'border-navy bg-navy text-white'
                        : 'border-border bg-surface text-navy'
                    }`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  className={pageBtnClass}
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
