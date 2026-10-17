import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { api } from './api';
import { parseWeekNumber } from './pages-puzzles';
import { askConfirm } from './prompt-dialog';
import { Alert, Button, Empty, Spinner } from './ui';

type QuestVideo = {
  id?: string;
  partNumber?: number;
  title?: string;
  videoUrl?: string;
  takeaways?: string[];
};

type QuestWeekItem = {
  id: string;
  weekNumber: number;
  title: string;
  scripture?: string;
  content?: string;
  declarationText?: string;
  videos?: QuestVideo[];
  objectiveQuiz?: QuizQuestion[];
  createdAt?: string;
  gameType?: 'PUZZLE' | 'MATCHING' | null;
  puzzleId?: string | null;
  matchingId?: string | null;
  puzzle?: { id: string; title: string } | null;
  matching?: { id: string; title: string } | null;
};

type QuizQuestion = {
  id?: string;
  question: string;
  options: string[];
  answerIndex: number;
  points?: number;
};

type FullQuestWeek = QuestWeekItem & {
  objectiveQuiz?: QuizQuestion[];
  gameType?: 'PUZZLE' | 'MATCHING' | null;
  puzzleId?: string | null;
  matchingId?: string | null;
  puzzle?: { id: string; title: string } | null;
  matching?: { id: string; title: string } | null;
};

type LinkedPuzzle = { title: string; status: string };

function youtubeThumb(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') id = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    else if (host.endsWith('youtube.com')) {
      id = parsed.searchParams.get('v') ?? '';
      if (!id) {
        const parts = parsed.pathname.split('/').filter(Boolean);
        const marker = parts.findIndex((part) => part === 'embed' || part === 'shorts');
        if (marker >= 0) id = parts[marker + 1] ?? '';
      }
    }
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
  } catch {
    return null;
  }
}

type WeekReadiness = {
  videoCount: number;
  quizCount: number;
  takeaways: number;
  puzzleTitle: string;
  hasDeclaration: boolean;
  complete: boolean;
};

function videoAt(videos: QuestVideo[], part: number): QuestVideo | undefined {
  return videos.find((item) => item.partNumber === part) ?? videos[part - 1];
}

/** A week is complete when it has 3 video URLs, a quiz question, the chosen game, and a word declaration. */
function weekReadiness(week: QuestWeekItem, puzzle?: LinkedPuzzle): WeekReadiness {
  const videos = Array.isArray(week.videos) ? week.videos : [];
  let videoCount = 0;
  let takeaways = 0;
  for (let part = 1; part <= 3; part += 1) {
    const video = videoAt(videos, part);
    if (video?.videoUrl?.trim()) videoCount += 1;
    const notes = Array.isArray(video?.takeaways) ? video.takeaways : [];
    takeaways += notes.filter((item) => item.trim()).length;
  }
  const quizCount = (Array.isArray(week.objectiveQuiz) ? week.objectiveQuiz : []).filter((question) =>
    question.question?.trim(),
  ).length;
  const hasDeclaration = Boolean(week.declarationText?.trim());
  const gameType = week.gameType === 'MATCHING' ? 'MATCHING' : 'PUZZLE';
  const gameTitle =
    gameType === 'MATCHING'
      ? week.matching?.title?.trim() || ''
      : puzzle?.title?.trim() || week.puzzle?.title?.trim() || '';
  const gameAttached =
    gameType === 'MATCHING' ? Boolean(week.matchingId && gameTitle) : Boolean(puzzle || week.puzzleId);
  return {
    videoCount,
    quizCount,
    takeaways,
    puzzleTitle: gameTitle,
    hasDeclaration,
    complete: videoCount === 3 && quizCount > 0 && gameAttached && hasDeclaration,
  };
}

type ParsedLesson = {
  reading: string;
  memoryRef: string;
  memoryText: string;
  playlistUrl: string;
  quizzes: Array<{ label: string; url: string }>;
};

function parseLesson(raw?: string): ParsedLesson | null {
  const content = raw?.trim();
  if (!content) return null;
  const reading = content.match(/^Bible reading:\s*(.+)$/im)?.[1]?.trim() ?? '';
  const memory = content.match(/^Memory scripture:\s*(.+)$/im)?.[1]?.trim() ?? '';
  const playlistUrl = content.match(/Playlist:\s*(https?:\/\/\S+)/i)?.[1]?.trim() ?? '';
  const quizBlock = content.split(/Quest check quizzes:\s*/i)[1] ?? '';
  const quizzes = quizBlock
    .split('\n')
    .map((line) => line.match(/^\s*[-–•]?\s*(.+?):\s*(https?:\/\/\S+)/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({ label: match[1].trim(), url: match[2].trim() }));
  if (!reading && !memory && !playlistUrl && quizzes.length === 0) return null;
  const pieces = memory.split(/\s+[—–-]\s+/);
  const memoryRef = pieces.length > 1 ? pieces[0].trim() : '';
  const memoryText = (pieces.length > 1 ? pieces.slice(1).join(' — ') : memory).trim();
  return { reading, memoryRef, memoryText, playlistUrl, quizzes };
}

function lessonLine(content?: string): string {
  const parsed = parseLesson(content);
  const source = parsed?.memoryText || parsed?.reading || '';
  if (source) return source.length > 88 ? `${source.slice(0, 88).trim()}…` : source;
  if (!content) return '';
  const cleaned = content.replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned.length > 88 ? `${cleaned.slice(0, 88).trim()}…` : cleaned;
}

function LessonView({ content }: { content?: string }) {
  const lesson = parseLesson(content);
  if (!lesson) {
    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy">
        {content?.trim() || 'No lesson text.'}
      </p>
    );
  }
  const links = [
    ...(lesson.playlistUrl ? [{ label: 'Playlist', url: lesson.playlistUrl }] : []),
    ...lesson.quizzes,
  ];
  return (
    <div className="flex flex-col gap-4">
      {lesson.memoryText ? (
        <figure>
          <blockquote className="text-[15px] font-medium leading-relaxed text-navy">{lesson.memoryText}</blockquote>
          {lesson.memoryRef ? (
            <figcaption className="mt-1.5 text-[11px] font-semibold tracking-wide text-teal">{lesson.memoryRef}</figcaption>
          ) : null}
        </figure>
      ) : null}
      {lesson.reading ? <p className="text-sm leading-relaxed text-text-2">{lesson.reading}</p> : null}
      {links.length > 0 ? (
        <ul className="overflow-hidden rounded-xl border border-border">
          {links.map((link) => (
            <li key={link.url} className="border-t border-border first:border-t-0">
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-navy no-underline hover:bg-cream"
              >
                <span className="min-w-0 truncate">{link.label}</span>
                <span className="shrink-0 text-xs font-semibold text-teal">Open</span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FieldMark({ label, value, ready }: { label: string; value: string; ready?: boolean }) {
  const tone = ready === undefined ? 'text-navy' : ready ? 'text-forest' : 'text-orange';
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className={`truncate text-[13px] font-semibold tabular-nums ${tone}`}>{value}</span>
    </span>
  );
}

export function QuestsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [weeks, setWeeks] = useState<QuestWeekItem[]>([]);
  const [puzzlesByWeek, setPuzzlesByWeek] = useState<Record<number, LinkedPuzzle>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'ready' | 'open'>('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<QuestWeekItem | null>(null);
  const [detail, setDetail] = useState<FullQuestWeek | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [panelIn, setPanelIn] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [flashWeek, setFlashWeek] = useState<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const highlightHandled = useRef<string | null>(null);
  const rowRefs = useRef<Record<number, HTMLLIElement | null>>({});

  function loadWeeks() {
    setLoading(true);
    Promise.all([
      api<QuestWeekItem[]>('/api/teen-quest/weeks'),
      api<{ versions: Array<{ title?: string; status?: string }> }>('/api/puzzles').catch(() => ({
        versions: [],
      })),
    ])
      .then(([data, puzzles]) => {
        setWeeks(Array.isArray(data) ? data : []);
        const map: Record<number, LinkedPuzzle> = {};
        for (const version of puzzles.versions ?? []) {
          const title = version.title?.trim();
          if (!title || version.status !== 'LIVE') continue;
          const weekNumber = parseWeekNumber(title);
          if (weekNumber != null && !map[weekNumber]) map[weekNumber] = { title, status: 'LIVE' };
        }
        setPuzzlesByWeek(map);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadWeeks();
  }, []);

  useEffect(() => {
    if (!selected) {
      setPanelIn(false);
      return;
    }
    const frame = requestAnimationFrame(() => setPanelIn(true));
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closePanel();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
    };
  }, [selected]);

  const matchedWeeks = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
    if (!q) return sorted;
    return sorted.filter((week) => {
      const label = `week ${week.weekNumber}`;
      return (
        String(week.weekNumber) === q ||
        label.includes(q) ||
        week.title.toLowerCase().includes(q) ||
        (week.scripture ?? '').toLowerCase().includes(q) ||
        (week.content ?? '').toLowerCase().includes(q) ||
        (week.declarationText ?? '').toLowerCase().includes(q)
      );
    });
  }, [weeks, query]);

  const readyTotal = useMemo(
    () => matchedWeeks.filter((week) => weekReadiness(week, puzzlesByWeek[week.weekNumber]).complete).length,
    [matchedWeeks, puzzlesByWeek],
  );

  const visibleWeeks = useMemo(() => {
    if (status === 'all') return matchedWeeks;
    return matchedWeeks.filter((week) => {
      const ready = weekReadiness(week, puzzlesByWeek[week.weekNumber]).complete;
      return status === 'ready' ? ready : !ready;
    });
  }, [matchedWeeks, puzzlesByWeek, status]);

  const pageSize = 12;

  useEffect(() => {
    if (loading) return;
    const raw = searchParams.get('highlight');
    if (!raw) return;
    if (highlightHandled.current === raw) return;
    const weekNumber = Number(raw);
    if (!Number.isFinite(weekNumber)) return;
    const week = weeks.find((w) => w.weekNumber === weekNumber);
    if (!week) return;
    highlightHandled.current = raw;
    setStatus('all');
    setQuery('');
    const index = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber).findIndex((w) => w.id === week.id);
    if (index >= 0) setPage(Math.floor(index / pageSize) + 1);
    void openWeek(week);
    setFlashWeek(weekNumber);
    setSearchParams({}, { replace: true });
    const clearFlash = window.setTimeout(() => setFlashWeek(null), 3500);
    return () => window.clearTimeout(clearFlash);
  }, [loading, weeks, searchParams, setSearchParams]);

  useEffect(() => {
    if (flashWeek == null) return;
    const node = rowRefs.current[flashWeek];
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [flashWeek, page]);

  function closePanel() {
    setPanelIn(false);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setSelected(null);
      setDetail(null);
    }, 220);
  }

  async function openWeek(week: QuestWeekItem) {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setSelected(week);
    setDetail(null);
    setDetailLoading(true);
    try {
      const full = await api<FullQuestWeek>(`/api/teen-quest/weeks/${week.weekNumber}`);
      setDetail(full);
    } catch {
      setDetail(week);
    } finally {
      setDetailLoading(false);
    }
  }

  async function deleteWeek(week: QuestWeekItem) {
    const ok = await askConfirm(`Delete week ${week.weekNumber} (“${week.title}”)?`, {
      title: 'Delete week',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setDeleteBusy(true);
    setError('');
    try {
      await api(`/api/teen-quest/admin/weeks/${week.id}`, { method: 'DELETE' });
      setSelected(null);
      setDetail(null);
      loadWeeks();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not delete this week');
    } finally {
      setDeleteBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(visibleWeeks.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageWeeks = visibleWeeks.slice((safePage - 1) * pageSize, safePage * pageSize);
  const rangeStart = visibleWeeks.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, visibleWeeks.length);

  const shown = detail ?? selected;
  const videos = Array.isArray(shown?.videos) ? shown.videos : [];
  const quiz = (Array.isArray(shown?.objectiveQuiz) ? shown.objectiveQuiz : []).filter((question) =>
    question.question?.trim(),
  );
  const puzzle = selected ? puzzlesByWeek[selected.weekNumber] : undefined;
  const shownReady = shown ? weekReadiness(shown, puzzle) : null;
  const heroThumb = youtubeThumb(videoAt(videos, 1)?.videoUrl);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <Button type="button" onClick={() => navigate('/app/dashboard/quests/new')}>
          + New quest week
        </Button>
      </div>

      {error ? <Alert kind="error">{error}</Alert> : null}

      {loading ? (
        <Spinner label="Loading quest weeks…" />
      ) : weeks.length === 0 ? (
        <Empty title="No quest weeks yet" body="Create the first week to start the 52-week journey." />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1.5">
              {(
                [
                  ['all', 'All', matchedWeeks.length],
                  ['ready', 'Ready', readyTotal],
                  ['open', 'Open', matchedWeeks.length - readyTotal],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setStatus(key);
                    setPage(1);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer ${
                    status === key
                      ? 'border-navy bg-navy text-white'
                      : 'border-border bg-surface text-navy hover:bg-cream'
                  }`}
                >
                  {label}
                  <span className={status === key ? 'text-white/70' : 'text-muted'}> {count}</span>
                </button>
              ))}
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Find a week, scripture, or lesson…"
              className="w-full rounded-full border border-border bg-surface px-4 py-2 text-xs text-navy placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-teal/30 sm:max-w-xs"
            />
          </div>

          {visibleWeeks.length === 0 ? (
            <Empty title="No matching weeks" body="Try another week number, title, or filter." />
          ) : (
            <ul className="flex flex-col gap-2">
              {pageWeeks.map((week) => {
                const active = selected?.id === week.id;
                const flashed = flashWeek === week.weekNumber;
                const parts = Array.isArray(week.videos) ? week.videos : [];
                const first = videoAt(parts, 1);
                const thumb = youtubeThumb(first?.videoUrl);
                const ready = weekReadiness(week, puzzlesByWeek[week.weekNumber]);
                const line = lessonLine(week.content);
                return (
                  <li
                    key={week.id}
                    ref={(node) => {
                      rowRefs.current[week.weekNumber] = node;
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => openWeek(week)}
                      className={`grid w-full cursor-pointer grid-cols-[7.25rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-2xl border bg-surface px-3 py-3 text-left transition-colors sm:grid-cols-[11rem_minmax(0,1fr)_15rem] ${
                        active || flashed
                          ? 'border-teal bg-teal-tint/50 ring-2 ring-teal/40'
                          : 'border-border hover:bg-cream'
                      }`}
                    >
                      <span className="relative block aspect-video overflow-hidden rounded-lg bg-navy">
                        {thumb ? (
                          <img src={thumb} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid h-full place-items-center text-[11px] font-semibold text-gold">No video</span>
                        )}
                        <span className="absolute left-1.5 top-1.5 rounded bg-navy/80 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-gold">
                          {String(week.weekNumber).padStart(2, '0')}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-semibold text-teal">
                          {week.scripture || 'No scripture'}
                        </span>
                        <span className="mt-0.5 block truncate text-[15px] font-semibold tracking-tight text-navy">
                          {week.title}
                        </span>
                        {line ? <span className="mt-1 block truncate text-xs leading-5 text-muted">{line}</span> : null}
                      </span>
                      <span className="col-span-2 grid grid-cols-3 gap-3 border-t border-border pt-3 sm:col-span-1 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
                        <FieldMark label="Videos" value={`${ready.videoCount}/3`} ready={ready.videoCount === 3} />
                        <FieldMark label="Quiz" value={ready.quizCount ? String(ready.quizCount) : 'None'} ready={ready.quizCount > 0} />
                        <FieldMark
                          label={week.gameType === 'MATCHING' ? 'Match' : 'Puzzle'}
                          value={ready.puzzleTitle ? 'Live' : 'None'}
                          ready={Boolean(ready.puzzleTitle)}
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {visibleWeeks.length > pageSize ? (
            <div className="flex items-center justify-between gap-3 pt-1 text-xs text-muted">
              <span>
                {rangeStart}–{rangeEnd} of {visibleWeeks.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 font-semibold text-navy cursor-pointer disabled:opacity-40"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`h-8 min-w-8 cursor-pointer rounded-lg border text-xs font-semibold ${
                      pageNum === safePage ? 'border-navy bg-navy text-white' : 'border-border bg-surface text-navy'
                    }`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 font-semibold text-navy cursor-pointer disabled:opacity-40"
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

      {selected ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-navy/40 cursor-pointer border-none"
            aria-label="Close week details"
            onClick={closePanel}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="quest-detail-title"
            className={`absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-surface shadow-2xl transition-transform duration-200 ease-out ${
              panelIn ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border bg-surface px-5 py-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal">
                  Week {String(selected.weekNumber).padStart(2, '0')}
                </p>
                <h2 id="quest-detail-title" className="text-lg font-semibold tracking-tight text-navy leading-tight">
                  {shown?.title || selected.title}
                </h2>
                {shown?.scripture ? <p className="mt-1 text-xs text-text-2">{shown.scripture}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-navy hover:bg-cream"
                  onClick={closePanel}
                >
                  Close
                </button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => navigate(`/app/dashboard/quests/${selected.weekNumber}`)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={deleteBusy}
                  onClick={() => deleteWeek(selected)}
                >
                  {deleteBusy ? 'Deleting…' : 'Delete'}
                </Button>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
              {detailLoading ? <p className="text-xs text-muted">Loading week details…</p> : null}

              <div className="aspect-video w-full shrink-0 overflow-hidden rounded-xl border border-border bg-navy">
                {heroThumb ? (
                  <img src={heroThumb} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-sm font-semibold text-gold">No opening video</div>
                )}
              </div>

              {shownReady ? (
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-border px-4 py-3 sm:grid-cols-5">
                  <FieldMark label="Videos" value={`${shownReady.videoCount}/3`} ready={shownReady.videoCount === 3} />
                  <FieldMark label="Quiz" value={shownReady.quizCount ? String(shownReady.quizCount) : 'None'} ready={shownReady.quizCount > 0} />
                  <FieldMark
                    label={shown?.gameType === 'MATCHING' ? 'Match' : 'Puzzle'}
                    value={shownReady.puzzleTitle ? 'Live' : 'None'}
                    ready={Boolean(shownReady.puzzleTitle)}
                  />
                  <FieldMark
                    label="Declare"
                    value={shownReady.hasDeclaration ? 'Written' : 'Missing'}
                    ready={shownReady.hasDeclaration}
                  />
                  <FieldMark label="Expect" value={String(shownReady.takeaways)} />
                </div>
              ) : null}

              <section className="flex flex-col gap-3 border-t border-border pt-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Word Declaration</h3>
                <p className={`text-sm leading-relaxed ${shown?.declarationText?.trim() ? 'text-navy' : 'text-orange'}`}>
                  {shown?.declarationText?.trim() || 'No declaration written.'}
                </p>
              </section>

              <section className="flex flex-col gap-3 border-t border-border pt-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Lesson</h3>
                <LessonView content={shown?.content} />
              </section>

              <section className="flex flex-col gap-3 border-t border-border pt-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Videos</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((part) => {
                    const video = videoAt(videos, part);
                    const thumb = youtubeThumb(video?.videoUrl);
                    const notes = (Array.isArray(video?.takeaways) ? video.takeaways : [])
                      .map((item) => item.trim())
                      .filter(Boolean)
                      .slice(0, 10);
                    return (
                      <div key={part} className="min-w-0">
                        <div className="aspect-video overflow-hidden rounded-lg border border-border bg-navy">
                          {thumb ? (
                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="grid h-full place-items-center text-[11px] font-semibold text-gold">Part {part}</span>
                          )}
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs font-semibold text-navy">{video?.title || 'Not added'}</p>
                        {video?.videoUrl ? (
                          <a href={video.videoUrl} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-teal">
                            Watch
                          </a>
                        ) : (
                          <p className="text-[11px] text-orange">Missing</p>
                        )}
                        {notes.length > 0 ? (
                          <ul className="mt-2 flex flex-col gap-1">
                            {notes.map((item) => (
                              <li key={item} className="text-[11px] leading-4 text-text-2">
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="flex flex-col gap-3 border-t border-border pt-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Quiz{quiz.length ? ` · ${quiz.length}` : ''}
                </h3>
                {quiz.length === 0 ? (
                  <p className="text-xs text-muted">{detailLoading ? 'Loading quiz…' : 'No quiz questions.'}</p>
                ) : (
                  <ol className="flex flex-col">
                    {quiz.map((question, index) => (
                      <li key={question.id || index} className="border-t border-border py-2.5 text-xs text-navy first:border-t-0 first:pt-0">
                        <span className="font-semibold">{question.question}</span>
                        <span className="mt-0.5 block text-forest">
                          {question.options?.[question.answerIndex] || '—'}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="flex flex-col gap-2 border-t border-border pt-5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Puzzle</h3>
                <p className={`text-sm font-semibold ${puzzle || detail?.puzzle ? 'text-navy' : 'text-orange'}`}>
                  {detail?.puzzle?.title || puzzle?.title || 'No puzzle attached to this week.'}
                </p>
                {detail?.puzzleId ? (
                  <Button
                    type="button"
                    size="sm"
                    className="self-start"
                    onClick={() => {
                      const back = `/app/dashboard/quests/${selected.weekNumber}?step=puzzle`;
                      navigate(
                        `/app/dashboard/puzzles?editPuzzle=${encodeURIComponent(detail.puzzleId!)}&returnTo=${encodeURIComponent(back)}`,
                      );
                    }}
                  >
                    Edit word arrangement
                  </Button>
                ) : (
                  <p className="text-xs text-muted">Open Edit, then attach a puzzle, to change its word arrangement.</p>
                )}
              </section>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
