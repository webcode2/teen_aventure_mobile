import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from './api';
import { Alert, Dialog, Empty, PageHeader, Spinner } from './ui';

export type QuestWeekItem = {
  id: string;
  weekNumber: number;
  title: string;
  scripture?: string;
  content?: string;
  videos?: Array<{
    id: string;
    partNumber: number;
    title: string;
    videoUrl: string;
  }>;
  createdAt?: string;
};

export type FullQuestWeek = QuestWeekItem & {
  objectiveQuiz?: Array<{
    id: string;
    question: string;
    options: string[];
    answerIndex: number;
    points: number;
  }>;
};

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PublishedWeeksPage() {
  const navigate = useNavigate();
  const [weeks, setWeeks] = useState<QuestWeekItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Search, sorting & pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'week-asc' | 'week-desc' | 'title-asc' | 'newest'>('week-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [previewWeek, setPreviewWeek] = useState<FullQuestWeek | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<QuestWeekItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  function loadWeeks() {
    setLoading(true);
    api<QuestWeekItem[]>('/api/teen-quest/weeks')
      .then((data) => {
        setWeeks(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadWeeks();
  }, []);

  // Filtered & sorted weeks
  const filteredWeeks = useMemo(() => {
    let result = [...weeks];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((w) => {
        const weekNumStr = `week ${w.weekNumber}`;
        const matchNum = String(w.weekNumber) === q || weekNumStr.includes(q);
        const matchTitle = (w.title || '').toLowerCase().includes(q);
        const matchScripture = (w.scripture || '').toLowerCase().includes(q);
        const matchContent = (w.content || '').toLowerCase().includes(q);
        return matchNum || matchTitle || matchScripture || matchContent;
      });
    }

    result.sort((a, b) => {
      if (sortBy === 'week-desc') return b.weekNumber - a.weekNumber;
      if (sortBy === 'title-asc') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'newest') {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      }
      return a.weekNumber - b.weekNumber;
    });

    return result;
  }, [weeks, searchTerm, sortBy]);

  // Pagination calculation
  const totalItems = filteredWeeks.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedWeeks = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredWeeks.slice(start, start + pageSize);
  }, [filteredWeeks, safePage, pageSize]);

  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  // Reset page when search or pageSize changes
  function handleSearchChange(val: string) {
    setSearchTerm(val);
    setCurrentPage(1);
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setCurrentPage(1);
  }

  // Preview full week (including objective questions)
  async function openPreview(w: QuestWeekItem) {
    setPreviewLoading(true);
    setPreviewWeek({ ...w });
    try {
      const full = await api<FullQuestWeek>(`/api/teen-quest/weeks/${w.weekNumber}`);
      setPreviewWeek(full);
    } catch {
      // Fallback to basic meta already loaded
    } finally {
      setPreviewLoading(false);
    }
  }

  // Delete handler
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setError('');
    setMessage('');
    try {
      await api(`/api/teen-quest/admin/weeks/${deleteTarget.id}`, { method: 'DELETE' });
      setMessage(`Week ${deleteTarget.weekNumber} ("${deleteTarget.title}") deleted.`);
      setDeleteTarget(null);
      loadWeeks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete quest week');
    } finally {
      setDeleteBusy(false);
    }
  }

  // Edit: navigate to quest editor with week preloaded
  function handleEditWeek(weekNumber: number) {
    navigate(`/app/dashboard/quests?week=${weekNumber}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        kicker="Curriculum"
        title="Published weeks"
        subtitle="Browse, inspect, and manage all scheduled Teen Quest discipleship weeks and quiz lessons."
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-navy hover:bg-teal text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
            onClick={() => navigate('/app/dashboard/quests')}
          >
            <span>+ Author new week</span>
          </button>
        }
      />

      {error ? <Alert kind="error">{error}</Alert> : null}
      {message ? <Alert kind="ok">{message}</Alert> : null}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface border border-border/80 shadow-xs">
          <div className="flex items-center justify-center h-10 w-10 shrink-0 rounded-xl bg-teal-tint text-teal ring-1 ring-teal/20">
            <CalendarIcon />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-navy tracking-tight tabular-nums">
                {weeks.length}
              </span>
              <span className="text-xs font-semibold text-navy">Published weeks</span>
            </div>
            <p className="text-[11px] text-muted mt-0.5">Active curriculum lessons</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface border border-border/80 shadow-xs">
          <div className="flex items-center justify-center h-10 w-10 shrink-0 rounded-xl bg-sage text-forest ring-1 ring-forest/20">
            <BookIcon />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-navy tracking-tight tabular-nums">
                {weeks.length > 0 ? `W${Math.max(...weeks.map((w) => w.weekNumber))}` : 'None'}
              </span>
              <span className="text-xs font-semibold text-navy">Latest week</span>
            </div>
            <p className="text-[11px] text-muted mt-0.5">Highest scheduled index</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface border border-border/80 shadow-xs">
          <div className="flex items-center justify-center h-10 w-10 shrink-0 rounded-xl bg-navy-tint text-navy ring-1 ring-navy/20">
            <SearchIcon />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-navy tracking-tight tabular-nums">
                {filteredWeeks.length}
              </span>
              <span className="text-xs font-semibold text-navy">Filtered matches</span>
            </div>
            <p className="text-[11px] text-muted mt-0.5">
              {searchTerm ? `Searching "${searchTerm}"` : 'All lessons included'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Box */}
      <div className="bg-surface border border-border rounded-card p-5 sm:p-6 shadow-xs flex flex-col gap-4">
        {/* Search, Sort & Page Size Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-cream text-muted focus-within:ring-2 focus-within:ring-teal/30 focus-within:border-teal transition-all flex-1 max-w-md">
            <SearchIcon />
            <input
              type="search"
              placeholder="Search by week, title, scripture, or keywords…"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-navy placeholder:text-muted/70 w-full"
            />
            {searchTerm ? (
              <button
                type="button"
                className="text-xs text-muted hover:text-navy cursor-pointer font-bold px-1"
                onClick={() => handleSearchChange('')}
                title="Clear search"
              >
                ✕
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex items-center gap-1.5 text-xs text-muted font-medium">
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="rounded-lg border border-border bg-cream px-2.5 py-1.5 text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-teal cursor-pointer"
              >
                <option value="week-asc">Week (1 → 52)</option>
                <option value="week-desc">Week (52 → 1)</option>
                <option value="title-asc">Title (A → Z)</option>
                <option value="newest">Recently created</option>
              </select>
            </label>

            <label className="flex items-center gap-1.5 text-xs text-muted font-medium">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="rounded-lg border border-border bg-cream px-2 py-1.5 text-xs font-medium text-navy focus:outline-none focus:ring-1 focus:ring-teal cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
          </div>
        </div>

        {/* Weeks Table */}
        {loading ? (
          <Spinner label="Loading published weeks…" />
        ) : filteredWeeks.length === 0 ? (
          <Empty
            title={searchTerm ? 'No matching weeks found' : 'No published weeks yet'}
            body={
              searchTerm
                ? 'Try adjusting your search terms or filter settings.'
                : 'Publish your first Teen Quest discipleship week using the quest authoring builder.'
            }
          />
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-muted uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3 w-24">Week</th>
                  <th className="py-3 px-3">Title &amp; Scripture</th>
                  <th className="py-3 px-3 hidden md:table-cell">Lesson excerpt</th>
                  <th className="py-3 px-3 hidden lg:table-cell w-32">Created</th>
                  <th className="py-3 px-3 text-right w-44">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedWeeks.map((w) => (
                  <tr
                    key={w.id}
                    className="border-b border-border/50 hover:bg-surface-2/25 transition-colors group"
                  >
                    {/* Week Badge */}
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-navy text-gold tracking-tight shadow-2xs">
                        W{w.weekNumber}
                      </span>
                    </td>

                    {/* Title & Scripture */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-1 min-w-[180px]">
                        <span className="font-bold text-navy text-sm group-hover:text-teal transition-colors">
                          {w.title}
                        </span>
                        {w.scripture ? (
                          <div className="inline-flex items-center gap-1.5 text-xs text-teal font-medium">
                            <BookIcon />
                            <span>{w.scripture}</span>
                          </div>
                        ) : null}
                      </div>
                    </td>

                    {/* Lesson Excerpt */}
                    <td className="py-3.5 px-3 hidden md:table-cell max-w-md">
                      <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                        {w.content || 'No text reflection provided.'}
                      </p>
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-3 hidden lg:table-cell text-muted text-xs whitespace-nowrap">
                      {w.createdAt ? new Date(w.createdAt).toLocaleDateString() : '—'}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-2 text-xs font-semibold text-navy transition-colors cursor-pointer"
                          onClick={() => openPreview(w)}
                          title="Preview full lesson & quiz"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg border border-teal/30 bg-teal-tint text-teal hover:bg-teal hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                          onClick={() => handleEditWeek(w.weekNumber)}
                          title={`Edit Week ${w.weekNumber} in builder`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg border border-error/20 bg-surface hover:bg-error-bg/60 text-xs font-semibold text-error transition-colors cursor-pointer"
                          onClick={() => setDeleteTarget(w)}
                          title={`Delete Week ${w.weekNumber}`}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60 text-xs text-muted">
            <div>
              Showing <strong className="text-navy">{startItem}</strong> to{' '}
              <strong className="text-navy">{endItem}</strong> of{' '}
              <strong className="text-navy">{totalItems}</strong> published weeks
            </div>

            <div className="flex items-center gap-1">
              {/* Previous page */}
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-navy font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ← Prev
              </button>

              {/* Numbered page buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                // Keep pagination compact if many pages
                const isEdge = pageNum === 1 || pageNum === totalPages;
                const isNearCurrent = Math.abs(pageNum - safePage) <= 1;
                if (!isEdge && !isNearCurrent) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return (
                      <span key={pageNum} className="px-1 text-muted">
                        …
                      </span>
                    );
                  }
                  return null;
                }

                const isActive = pageNum === safePage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    className={`min-w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-navy text-white shadow-xs'
                        : 'border border-border bg-surface hover:bg-surface-2 text-navy'
                    }`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next page */}
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-navy font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Preview Modal Dialog */}
      <Dialog
        open={previewWeek !== null}
        onClose={() => setPreviewWeek(null)}
        title={previewWeek ? `Week ${previewWeek.weekNumber}: ${previewWeek.title}` : 'Week details'}
        subtitle="Teen Quest curriculum overview and quiz specifications"
      >
        {previewWeek ? (
          <div className="flex flex-col gap-4 text-xs">
            {previewLoading ? (
              <div className="py-4 text-center text-muted">Loading full lesson data…</div>
            ) : null}

            {/* Scripture Pill */}
            {previewWeek.scripture ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-teal-tint/40 border border-teal/20 text-teal">
                <BookIcon />
                <span className="font-semibold text-navy">Scripture passage:</span>
                <span className="font-bold">{previewWeek.scripture}</span>
              </div>
            ) : null}

            {/* Lesson Body */}
            <div className="flex flex-col gap-1.5 p-4 rounded-xl border border-border bg-cream">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Lesson reflection
              </span>
              <p className="text-xs text-navy whitespace-pre-wrap leading-relaxed">
                {previewWeek.content || 'No text content.'}
              </p>
            </div>

            {/* Objective Questions Preview */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Objective Quiz Questions ({previewWeek.objectiveQuiz?.length || 0})
              </span>
              {previewWeek.objectiveQuiz && previewWeek.objectiveQuiz.length > 0 ? (
                <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {previewWeek.objectiveQuiz.map((q, qi) => (
                    <div
                      key={q.id || qi}
                      className="p-3 rounded-xl border border-border bg-surface flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-navy">
                          Q{qi + 1}: {q.question}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-2 text-navy border border-border">
                          {q.points || 5} pts
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {q.options.map((opt, oi) => {
                          const isAnswer = q.answerIndex === oi;
                          return (
                            <div
                              key={oi}
                              className={`px-2 py-1 rounded-md text-[11px] border ${
                                isAnswer
                                  ? 'bg-sage text-forest border-forest/30 font-semibold'
                                  : 'bg-cream text-muted border-border/60'
                              }`}
                            >
                              {isAnswer ? '✓ ' : ''}
                              {opt || `(Option ${oi + 1})`}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted text-xs italic">No objective quiz questions configured.</p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-2 text-navy font-semibold text-xs transition-colors cursor-pointer"
                onClick={() => setPreviewWeek(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-navy hover:bg-teal text-white font-semibold text-xs transition-colors cursor-pointer"
                onClick={() => {
                  const num = previewWeek.weekNumber;
                  setPreviewWeek(null);
                  handleEditWeek(num);
                }}
              >
                Edit in Builder →
              </button>
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* Delete Confirmation Modal Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Confirm week deletion"
        subtitle="This action will delete the quest week from the discipleship curriculum"
      >
        {deleteTarget ? (
          <div className="flex flex-col gap-4 text-xs">
            <p className="text-navy leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-error font-bold">
                Week {deleteTarget.weekNumber} ("{deleteTarget.title}")
              </strong>
              ? This will remove the scripture reading, lesson reflection, and associated quiz questions from
              the mobile app.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-border bg-surface hover:bg-surface-2 text-navy font-semibold text-xs transition-colors cursor-pointer"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-error hover:bg-error/90 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                onClick={confirmDelete}
                disabled={deleteBusy}
              >
                {deleteBusy ? 'Deleting…' : 'Delete week'}
              </button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
