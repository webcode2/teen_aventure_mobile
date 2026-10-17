import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { api } from './api';
import { askConfirm } from './prompt-dialog';
import { Alert, Button, Badge, Empty, Spinner } from './ui';

type PublishedRow = {
  id: string;
  matchingId?: string;
  matchingKey: string;
  version: number;
  status: string;
  title: string;
  attachedWeekNumber?: number | null;
  canDelete?: boolean;
  stagedAt?: string;
  updatedAt?: string;
  liveAt?: string | null;
};

type StatusFilter = 'all' | 'LIVE' | 'STAGED';
type QuestFilter = 'all' | 'attached' | 'free';

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

/** One LIVE + latest STAGED per matching identity. */
function collapsePublished(versions: PublishedRow[]): PublishedRow[] {
  const byKey = new Map<string, { live?: PublishedRow; staged?: PublishedRow }>();
  for (const v of versions) {
    const key = v.matchingId || v.matchingKey || v.id;
    const slot = byKey.get(key) ?? {};
    if (v.status === 'LIVE') {
      if (!slot.live || v.version > slot.live.version) slot.live = v;
    } else if (v.status === 'STAGED') {
      if (!slot.staged || v.version > slot.staged.version) slot.staged = v;
    }
    byKey.set(key, slot);
  }
  const out: PublishedRow[] = [];
  for (const slot of byKey.values()) {
    if (slot.live) out.push(slot.live);
    if (slot.staged) out.push(slot.staged);
  }
  return out.sort((a, b) => {
    const ta = new Date(a.updatedAt || a.liveAt || a.stagedAt || 0).getTime();
    const tb = new Date(b.updatedAt || b.liveAt || b.stagedAt || 0).getTime();
    return tb - ta;
  });
}

export function MatchingLibraryPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PublishedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [quest, setQuest] = useState<QuestFilter>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback((opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    api<{ versions: PublishedRow[] }>('/api/matchings')
      .then((res) => {
        setError('');
        setRows(
          collapsePublished(
            (res.versions ?? []).filter((v) => v.status === 'STAGED' || v.status === 'LIVE'),
          ),
        );
      })
      .catch((e: Error) => setError(e.message || 'Failed to load match library'))
      .finally(() => {
        if (!opts?.quiet) setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (quest === 'attached' && r.attachedWeekNumber == null) return false;
      if (quest === 'free' && r.attachedWeekNumber != null) return false;
      if (
        needle &&
        !r.title.toLowerCase().includes(needle) &&
        !r.matchingKey.toLowerCase().includes(needle) &&
        !String(r.version).includes(needle)
      ) {
        return false;
      }
      return true;
    });
  }, [rows, status, quest, q]);

  useEffect(() => {
    setPage(1);
  }, [status, quest, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);
  const filtersActive = status !== 'all' || quest !== 'all' || q.trim() !== '';

  function openUpdate(r: PublishedRow) {
    setSelectedId(r.id);
    if (r.matchingId && r.status === 'LIVE') {
      navigate(`/app/dashboard/matching?editMatching=${encodeURIComponent(r.matchingId)}`);
      return;
    }
    navigate(`/app/dashboard/matching?version=${encodeURIComponent(r.id)}`);
  }

  async function promote(r: PublishedRow) {
    if (r.status !== 'STAGED') return;
    setBusyId(r.id);
    setActionError('');
    try {
      await api(`/api/matchings/versions/${r.id}/promote`, { method: 'POST', body: '{}' });
      load({ quiet: true });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Promote failed');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteRow(r: PublishedRow) {
    if (r.canDelete === false) {
      setActionError(
        r.attachedWeekNumber != null
          ? `Cannot delete: attached to week ${r.attachedWeekNumber}. Open that quest week, detach this match game, then return here to delete.`
          : 'Cannot delete a LIVE match that is attached to a quest week.',
      );
      return;
    }
    const ok = await askConfirm(
      r.status === 'LIVE'
        ? `Delete LIVE “${r.title}”? This removes the published match permanently.`
        : `Delete staged “${r.title}” (pub v${r.version})?`,
      {
        title: r.status === 'LIVE' ? 'Delete LIVE match' : 'Delete staged match',
        confirmLabel: 'Delete',
        tone: 'danger',
      },
    );
    if (!ok) return;
    setBusyId(r.id);
    setActionError('');
    try {
      await api(`/api/matchings/versions/${r.id}`, { method: 'DELETE' });
      if (selectedId === r.id) setSelectedId(null);
      load({ quiet: true });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {embedded ? (
        <p className="m-0 text-xs text-muted">
          Published match games. Open one to edit in the New tab. Delete stays disabled while a quest week uses the match.
        </p>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="m-0 text-2xl font-semibold tracking-tight text-navy">Match library</h1>
            <p className="m-0 mt-1 text-xs text-muted">
              Published match games. Delete is only available when the match is not attached to a quest week.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex cursor-pointer items-center justify-center rounded-none border border-border bg-surface px-4 py-2 text-xs font-bold text-navy transition-colors hover:bg-cream"
              onClick={() => navigate('/app/dashboard/matching')}
            >
              Open studio
            </button>
            <Button type="button" onClick={() => navigate('/app/dashboard/matching?new=1')}>
              + New match
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="relative min-w-[14rem] flex-1">
          <span className="sr-only">Search matches</span>
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted" aria-hidden>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or key…"
            aria-label="Search matches"
            className="w-full rounded-none border border-border bg-cream py-2.5 pl-10 pr-4 text-sm text-navy placeholder:text-muted/70 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/25"
          />
        </label>
        <label className="flex min-w-[9rem] flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Status</span>
          <select
            className={filterSelectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
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
        Update opens the match in Studio. Delete stays disabled while a quest week uses the match — detach it on the quest first.
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
          title={rows.length === 0 ? 'No published matches' : 'No matches'}
          body={
            rows.length === 0
              ? 'Publish + LIVE from Match Studio to add entries here.'
              : 'Try a different search or filter.'
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          <DataTableShell>
            <thead>
              <tr>
                <th className={thClass}>Title</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Version</th>
                <th className={thClass}>Quest week</th>
                <th className={thClass}>Key</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => {
                const busy = busyId === r.id;
                const liveLocked = r.status === 'LIVE' && r.canDelete === false;
                return (
                  <tr
                    key={r.id}
                    className={rowClass(selectedId === r.id)}
                    onClick={() => openUpdate(r)}
                  >
                    <td className={`${tdClass} font-semibold`}>
                      <div className="flex min-w-[10rem] items-center gap-2.5">
                        <TitleAvatar title={r.title} />
                        <span className="truncate">{r.title}</span>
                      </div>
                    </td>
                    <td className={tdClass}>
                      {r.status === 'LIVE' ? (
                        <Badge kind="ok">LIVE</Badge>
                      ) : (
                        <Badge kind="warn">STAGED</Badge>
                      )}
                    </td>
                    <td className={`${tdClass} text-muted`}>pub v{r.version}</td>
                    <td className={`${tdClass} text-muted`}>
                      {r.attachedWeekNumber != null ? `Week ${r.attachedWeekNumber}` : '—'}
                    </td>
                    <td className={`${tdClass} max-w-[12rem] truncate text-muted`}>{r.matchingKey}</td>
                    <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm" type="button"
                           
                          onClick={() => openUpdate(r)}
                        >
                          Update
                        </Button>
                        {r.status === 'STAGED' ? (
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
                          disabled={busy || liveLocked}
                          title={
                            liveLocked
                              ? r.attachedWeekNumber != null
                                ? `Attached to week ${r.attachedWeekNumber}. Detach it on the quest week to enable delete.`
                                : 'Attached to a quest week'
                              : undefined
                          }
                          className="cursor-pointer rounded-none border border-error/30 bg-error-bg/40 px-2.5 py-1 text-[11px] font-semibold text-error hover:bg-error-bg disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => void deleteRow(r)}
                        >
                          {busy ? '…' : 'Delete'}
                        </button>
                      </div>
                      {liveLocked && r.attachedWeekNumber != null ? (
                        <p className="m-0 mt-1 max-w-[16rem] text-[10px] leading-snug text-muted">
                          Detach from quest week {r.attachedWeekNumber} to enable delete.
                        </p>
                      ) : null}
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
