import './quest-editor.css';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import type { QuestGameType } from '@askhub/puzzle-contracts';
import { api } from './api';
import { questGameStepLabel } from './quest-game';
import { Alert, Button, Spinner } from './ui';

type LivePuzzleOption = {
  id: string;
  puzzleId?: string;
  puzzleKey: string;
  title: string;
  status: string;
};

type LiveMatchingOption = {
  id: string;
  matchingId?: string;
  matchingKey: string;
  title: string;
  status: string;
};

/** Backend type names (MULTIPLE_CHOICE | FILL_BLANK). UI shows friendly labels. */
export type ObjQuestionType = 'MULTIPLE_CHOICE' | 'FILL_BLANK';

export type ObjQuestion = {
  id: string;
  type: ObjQuestionType;
  question: string;
  options: [string, string, string, string];
  answerIndex: number;
  /** Accepted answers for FILL_BLANK (case/space insensitive on grade). */
  acceptedAnswers: string[];
  points: number;
};

export type QuestVideo = {
  id: string;
  partNumber: number;
  title: string;
  subtitle?: string;
  duration?: string;
  videoUrl: string;
  speaker?: string;
  takeaways?: string[];
};

export type QuestWeek = {
  id: string;
  weekNumber: number;
  title: string;
  puzzleId?: string | null;
  matchingId?: string | null;
};

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function blankQuestion(type: ObjQuestionType = 'MULTIPLE_CHOICE'): ObjQuestion {
  return {
    id: newId('q'),
    type,
    question: '',
    options: ['', '', '', ''],
    answerIndex: 0,
    acceptedAnswers: type === 'FILL_BLANK' ? [''] : [],
    points: 10,
  };
}

function quizTypeLabel(type: ObjQuestionType) {
  return type === 'FILL_BLANK' ? 'Fill in the blank' : 'Multiple choice';
}

function normalizeQuestion(raw: Partial<ObjQuestion> & { id?: string }): ObjQuestion {
  const type: ObjQuestionType = raw.type === 'FILL_BLANK' ? 'FILL_BLANK' : 'MULTIPLE_CHOICE';
  const options = Array.isArray(raw.options)
    ? ([0, 1, 2, 3].map((i) => String(raw.options?.[i] ?? '')) as [string, string, string, string])
    : (['', '', '', ''] as [string, string, string, string]);
  const accepted = Array.isArray(raw.acceptedAnswers)
    ? raw.acceptedAnswers.map((a) => String(a))
    : [];
  return {
    id: String(raw.id || newId('q')),
    type,
    question: String(raw.question || ''),
    options,
    answerIndex: Number(raw.answerIndex) || 0,
    acceptedAnswers: type === 'FILL_BLANK' ? (accepted.length ? accepted : ['']) : [],
    points: Number(raw.points) || 10,
  };
}

type QuestFormState = {
  weekNumber: number;
  title: string;
  scripture: string;
  content: string;
  declarationText: string;
};

type QuestDraft = {
  savedAt: number;
  step: number;
  form: QuestFormState;
  videos: QuestVideo[];
  questions: ObjQuestion[];
  gameType: QuestGameType;
  puzzleId: string | null;
  puzzleTitle: string;
  matchingId: string | null;
  matchingTitle: string;
};

function draftStorageKey(weekParam?: string) {
  return weekParam ? `tba-quest-draft:${weekParam}` : 'tba-quest-draft:new';
}

function arrangementHref(puzzleId: string, weekNumber: number) {
  const back = `/app/dashboard/quests/${weekNumber}?step=puzzle`;
  return `/app/dashboard/puzzles?editPuzzle=${encodeURIComponent(puzzleId)}&returnTo=${encodeURIComponent(back)}`;
}

function createPuzzleHref(weekNumber: number, weekTitle?: string) {
  const back = `/app/dashboard/quests/${weekNumber}?step=puzzle`;
  const params = new URLSearchParams({
    new: '1',
    returnTo: back,
    week: String(weekNumber),
  });
  const title = weekTitle?.trim();
  if (title) params.set('title', title);
  return `/app/dashboard/puzzles?${params.toString()}`;
}

function readQuestDraft(key: string): QuestDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as QuestDraft;
    if (!data?.form || typeof data.form.weekNumber !== 'number') return null;
    if (!Array.isArray(data.videos) || !Array.isArray(data.questions)) return null;
    return {
      ...data,
      gameType: data.gameType === 'MATCHING' ? 'MATCHING' : 'PUZZLE',
      puzzleId: typeof data.puzzleId === 'string' ? data.puzzleId : null,
      puzzleTitle: typeof data.puzzleTitle === 'string' ? data.puzzleTitle : '',
      matchingId: typeof data.matchingId === 'string' ? data.matchingId : null,
      matchingTitle: typeof data.matchingTitle === 'string' ? data.matchingTitle : '',
    };
  } catch {
    return null;
  }
}

function createMatchHref(weekNumber: number) {
  return `/app/dashboard/matching?returnTo=${encodeURIComponent(`/app/dashboard/quests/${weekNumber}?step=game`)}`;
}

function defaultVideosForWeek(weekNum: number, weekTitle?: string): QuestVideo[] {
  const t = weekTitle?.trim() || 'Biblical Adventure';
  return [
    {
      id: `v-${weekNum}-1`,
      partNumber: 1,
      title: `Part 1: Calling & Context of ${t}`,
      subtitle: 'Watched',
      duration: '4:20',
      videoUrl: 'https://www.youtube.com/watch?v=1gK4y693qwY',
    },
    {
      id: `v-${weekNum}-2`,
      partNumber: 2,
      title: `Part 2: The Core Challenge & Encounter`,
      subtitle: 'Watched',
      duration: '5:45',
      videoUrl: 'https://www.youtube.com/watch?v=pWVTmUbS3pQ',
    },
    {
      id: `v-${weekNum}-3`,
      partNumber: 3,
      title: `Part 3: Jael's Tent Peg & Song of Victory`,
      subtitle: 'Watched',
      duration: '4:50',
      videoUrl: 'https://www.youtube.com/watch?v=vY3qg91wEzo',
    },
  ];
}

export function QuestEditorPage() {
  const navigate = useNavigate();
  const { week: weekParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Core week form state
  const [form, setForm] = useState({
    weekNumber: 1,
    title: 'Be Strong and Courageous',
    scripture: 'Joshua 1:9',
    content:
      'Have I not commanded you? Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.',
    declarationText: 'I declare: I am strong and courageous. The Lord my God is with me wherever I go.',
  });

  // 1. Exactly 3 Videos per Quest
  const [videos, setVideos] = useState<QuestVideo[]>([
    {
      id: 'v1',
      partNumber: 1,
      title: "Part 1: Deborah's Calling under the Palm",
      subtitle: 'Watched',
      duration: '4:20',
      videoUrl: 'https://www.youtube.com/watch?v=1gK4y693qwY',
    },
    {
      id: 'v2',
      partNumber: 2,
      title: 'Part 2: Barak & 10,000 Men at Mt. Tabor',
      subtitle: 'Watched',
      duration: '5:45',
      videoUrl: 'https://www.youtube.com/watch?v=pWVTmUbS3pQ',
    },
    {
      id: 'v3',
      partNumber: 3,
      title: "Part 3: Jael's Tent Peg & Song of Victory",
      subtitle: 'Watched',
      duration: '4:50',
      videoUrl: 'https://www.youtube.com/watch?v=vY3qg91wEzo',
    },
  ]);

  // 2. Objective Quiz — admin picks type per question (MULTIPLE_CHOICE | FILL_BLANK)
  const [questions, setQuestions] = useState<ObjQuestion[]>([]);

  // 3. Attach one LIVE game (puzzle crossword or match pairs)
  const [gameType, setGameType] = useState<QuestGameType>('PUZZLE');
  const [puzzleId, setPuzzleId] = useState<string | null>(null);
  const [puzzleTitle, setPuzzleTitle] = useState('');
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [matchingTitle, setMatchingTitle] = useState('');
  const [livePuzzles, setLivePuzzles] = useState<LivePuzzleOption[]>([]);
  const [livePuzzlesLoading, setLivePuzzlesLoading] = useState(true);
  const [livePuzzlesError, setLivePuzzlesError] = useState('');
  const [liveMatchings, setLiveMatchings] = useState<LiveMatchingOption[]>([]);
  const [liveMatchingsLoading, setLiveMatchingsLoading] = useState(true);
  const [liveMatchingsError, setLiveMatchingsError] = useState('');

  // Preview / UI state
  const [weeks, setWeeks] = useState<QuestWeek[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [draftAt, setDraftAt] = useState<number | null>(null);
  const [draftNote, setDraftNote] = useState('');
  const [previewAnswer, setPreviewAnswer] = useState<number | null>(null);
  const [expandedPreviewItem, setExpandedPreviewItem] = useState<'quiz' | 'puzzle' | 'video1' | null>(null);

  function load() {
    api<QuestWeek[]>('/api/teen-quest/weeks')
      .then(setWeeks)
      .catch((e: Error) => setError(e.message));
  }

  function loadLivePuzzles(weekNumber: number) {
    setLivePuzzlesLoading(true);
    setLivePuzzlesError('');
    Promise.all([
      api<{ versions: LivePuzzleOption[] }>('/api/puzzles'),
      api<QuestWeek[]>('/api/teen-quest/weeks').catch(() => [] as QuestWeek[]),
    ])
      .then(([res, weekRows]) => {
        const live = (res.versions ?? []).filter((v) => v.status === 'LIVE' && v.puzzleId);
        // One row per puzzleId (latest version first if API returns multiples).
        const byId = new Map<string, LivePuzzleOption>();
        for (const v of live) {
          const id = v.puzzleId!;
          if (!byId.has(id)) byId.set(id, v);
        }
        // Hide puzzles already attached to another quest week (this week may keep its own).
        const takenElsewhere = new Set(
          weekRows
            .filter((w) => w.puzzleId && w.weekNumber !== weekNumber)
            .map((w) => w.puzzleId!),
        );
        setLivePuzzles(
          [...byId.values()]
            .filter((p) => !p.puzzleId || !takenElsewhere.has(p.puzzleId))
            .sort((a, b) => a.title.localeCompare(b.title)),
        );
      })
      .catch((e: Error) => {
        setLivePuzzles([]);
        setLivePuzzlesError(e.message || 'Could not load puzzles');
      })
      .finally(() => setLivePuzzlesLoading(false));
  }

  function loadLiveMatchings(weekNumber: number) {
    setLiveMatchingsLoading(true);
    setLiveMatchingsError('');
    Promise.all([
      api<{ versions: LiveMatchingOption[] }>('/api/matchings'),
      api<QuestWeek[]>('/api/teen-quest/weeks').catch(() => [] as QuestWeek[]),
    ])
      .then(([res, weekRows]) => {
        const live = (res.versions ?? []).filter((v) => v.status === 'LIVE' && v.matchingId);
        const byId = new Map<string, LiveMatchingOption>();
        for (const v of live) {
          const id = v.matchingId!;
          if (!byId.has(id)) byId.set(id, v);
        }
        const takenElsewhere = new Set(
          weekRows
            .filter((w) => w.matchingId && w.weekNumber !== weekNumber)
            .map((w) => w.matchingId!),
        );
        setLiveMatchings(
          [...byId.values()]
            .filter((m) => !m.matchingId || !takenElsewhere.has(m.matchingId))
            .sort((a, b) => a.title.localeCompare(b.title)),
        );
      })
      .catch((e: Error) => {
        setLiveMatchings([]);
        setLiveMatchingsError(e.message || 'Could not load match games');
      })
      .finally(() => setLiveMatchingsLoading(false));
  }

  useEffect(() => {
    load();
    loadLivePuzzles(form.weekNumber);
    loadLiveMatchings(form.weekNumber);
  }, []);

  useEffect(() => {
    if (step === 3) {
      loadLivePuzzles(form.weekNumber);
      loadLiveMatchings(form.weekNumber);
    }
  }, [step, form.weekNumber]);

  // Returning from Puzzle Studio with ?puzzleId=…
  useEffect(() => {
    const fromStudio = searchParams.get('puzzleId');
    if (!fromStudio) return;
    setGameType('PUZZLE');
    setPuzzleId(fromStudio);
    setMatchingId(null);
    setMatchingTitle('');
    const match = livePuzzles.find((p) => p.puzzleId === fromStudio);
    if (match) setPuzzleTitle(match.title);
    setStep(3);
    setMessage('Puzzle attached from Studio. Save the quest to keep it.');
    const next = new URLSearchParams(searchParams);
    next.delete('puzzleId');
    setSearchParams(next, { replace: true });
  }, [searchParams, livePuzzles, setSearchParams]);

  // Returning from Match Studio with ?matchingId=…
  useEffect(() => {
    const fromStudio = searchParams.get('matchingId');
    if (!fromStudio) return;
    setGameType('MATCHING');
    setMatchingId(fromStudio);
    setPuzzleId(null);
    setPuzzleTitle('');
    const match = liveMatchings.find((p) => p.matchingId === fromStudio);
    if (match) setMatchingTitle(match.title);
    setStep(3);
    setMessage('Match game attached from Studio. Save the quest to keep it.');
    const next = new URLSearchParams(searchParams);
    next.delete('matchingId');
    setSearchParams(next, { replace: true });
  }, [searchParams, liveMatchings, setSearchParams]);

  useEffect(() => {
    if (!ready) return;
    const stepParam = searchParams.get('step');
    if (stepParam !== 'puzzle' && stepParam !== 'game') return;
    setStep(3);
    const next = new URLSearchParams(searchParams);
    next.delete('step');
    setSearchParams(next, { replace: true });
  }, [ready, searchParams, setSearchParams]);

  const draftKey = draftStorageKey(weekParam);
  const latestDraft = useRef<QuestDraft | null>(null);
  const draftBaseline = useRef('');

  function applyDraft(stored: QuestDraft) {
    setForm(stored.form);
    setVideos(stored.videos);
    setQuestions(stored.questions.length ? stored.questions.map((q) => normalizeQuestion(q)) : [blankQuestion()]);
    setGameType(stored.gameType === 'MATCHING' ? 'MATCHING' : 'PUZZLE');
    setPuzzleId(stored.puzzleId);
    setPuzzleTitle(stored.puzzleTitle);
    setMatchingId(stored.matchingId);
    setMatchingTitle(stored.matchingTitle);
    setStep(Math.min(4, Math.max(0, Number(stored.step) || 0)));
    setDraftAt(stored.savedAt);
    setDraftNote('Draft restored');
  }

  useEffect(() => {
    let alive = true;
    setReady(false);
    setStep(0);
    setDraftAt(null);
    setDraftNote('');
    (async () => {
      let list: QuestWeek[] = [];
      try {
        const data = await api<QuestWeek[]>('/api/teen-quest/weeks');
        list = Array.isArray(data) ? data : [];
      } catch (err: unknown) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Could not load weeks');
      }
      if (!alive) return;
      setWeeks(list);
      const stored = readQuestDraft(draftStorageKey(weekParam));
      const num = Number(weekParam);
      if (weekParam && Number.isFinite(num) && num > 0) {
        await editWeek(num);
        if (!alive) return;
        if (stored && stored.form.weekNumber === num) applyDraft(stored);
      } else if (stored) {
        applyDraft(stored);
      } else {
        const nextNum = list.reduce((max, w) => Math.max(max, w.weekNumber), 0) + 1;
        setForm({
          weekNumber: nextNum,
          title: '',
          scripture: '',
          content: '',
          declarationText: 'I declare: I am a child of God, walking in faith and obedience to His Word.',
        });
        setVideos(defaultVideosForWeek(nextNum));
        setQuestions([blankQuestion()]);
        setGameType('PUZZLE');
        setPuzzleId(null);
        setPuzzleTitle('');
        setMatchingId(null);
        setMatchingTitle('');
        setMessage('');
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [weekParam]);

  useEffect(() => {
    if (!ready) {
      draftBaseline.current = '';
      return;
    }
    const body = JSON.stringify({
      step,
      form,
      videos,
      questions,
      gameType,
      puzzleId,
      puzzleTitle,
      matchingId,
      matchingTitle,
    });
    if (!draftBaseline.current) {
      draftBaseline.current = body;
      return;
    }
    if (body === draftBaseline.current) return;
    const draft: QuestDraft = {
      savedAt: Date.now(),
      step,
      form,
      videos,
      questions,
      gameType,
      puzzleId,
      puzzleTitle,
      matchingId,
      matchingTitle,
    };
    latestDraft.current = draft;
    const handle = window.setTimeout(() => {
      const saved = { ...draft, savedAt: Date.now() };
      localStorage.setItem(draftKey, JSON.stringify(saved));
      latestDraft.current = saved;
      setDraftAt(saved.savedAt);
      setDraftNote('Draft saved');
    }, 400);
    return () => window.clearTimeout(handle);
  }, [ready, draftKey, step, form, videos, questions, gameType, puzzleId, puzzleTitle, matchingId, matchingTitle]);

  useEffect(() => {
    function flush() {
      if (!ready || !latestDraft.current) return;
      const saved = { ...latestDraft.current, savedAt: Date.now() };
      localStorage.setItem(draftKey, JSON.stringify(saved));
    }
    window.addEventListener('beforeunload', flush);
    function onHide() {
      if (document.visibilityState === 'hidden') flush();
    }
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [ready, draftKey]);

  function asOptions(raw: unknown): [string, string, string, string] {
    const list = Array.isArray(raw) ? raw.map(String) : [];
    return [list[0] ?? '', list[1] ?? '', list[2] ?? '', list[3] ?? ''];
  }

  async function editWeek(weekNumber: number) {
    setMessage('');
    setError('');
    try {
      const week = await api<{
        weekNumber: number;
        title: string;
        scripture: string;
        content: string;
        declarationText?: string;
        videos?: QuestVideo[];
        objectiveQuiz?: unknown;
        gameType?: QuestGameType | null;
        puzzleId?: string | null;
        matchingId?: string | null;
        puzzle?: { id: string; title: string; puzzleKey: string; liveVersionId: string | null } | null;
        matching?: { id: string; title: string; matchingKey: string; liveVersionId: string | null } | null;
      }>(`/api/teen-quest/weeks/${weekNumber}`);

      setForm({
        weekNumber: week.weekNumber,
        title: week.title,
        scripture: week.scripture,
        content: week.content,
        declarationText: (week.declarationText ?? '').trim(),
      });

      // Populate videos or normalize to 3 parts
      const rawVids = Array.isArray(week.videos) ? (week.videos as QuestVideo[]) : [];
      if (rawVids.length > 0) {
        const normalized = [1, 2, 3].map((partNum) => {
          const existing = rawVids.find((v) => v.partNumber === partNum) || rawVids[partNum - 1];
          if (existing) {
            return {
              id: existing.id || `v-${weekNumber}-${partNum}`,
              partNumber: partNum,
              title: existing.title || `Part ${partNum}: ${week.title}`,
              subtitle: existing.subtitle || 'Watched',
              duration: existing.duration || '5:00',
              videoUrl: existing.videoUrl || '',
              takeaways: Array.isArray(existing.takeaways)
                ? existing.takeaways.map((item) => String(item).trim()).filter(Boolean).slice(0, 10)
                : [],
            };
          }
          return defaultVideosForWeek(weekNumber, week.title)[partNum - 1];
        });
        setVideos(normalized);
      } else {
        setVideos(defaultVideosForWeek(weekNumber, week.title));
      }

      // Objective Quiz
      const objs = Array.isArray(week.objectiveQuiz) ? week.objectiveQuiz : [];
      setQuestions(
        objs.length
          ? objs.map((q: Record<string, unknown>) => {
              const type: ObjQuestionType = q.type === 'FILL_BLANK' ? 'FILL_BLANK' : 'MULTIPLE_CHOICE';
              const accepted = Array.isArray(q.acceptedAnswers)
                ? q.acceptedAnswers.map((a) => String(a))
                : [];
              return {
                id: String(q.id || newId('q')),
                type,
                question: String(q.question || ''),
                options: asOptions(q.options),
                answerIndex: Number(q.answerIndex) || 0,
                acceptedAnswers: type === 'FILL_BLANK' ? (accepted.length ? accepted : ['']) : [],
                points: Number(q.points) || 10,
              };
            })
          : [blankQuestion()],
      );

      const nextGameType: QuestGameType = week.gameType === 'MATCHING' ? 'MATCHING' : 'PUZZLE';
      const attachedPuzzleId = typeof week.puzzleId === 'string' ? week.puzzleId : null;
      const attachedPuzzleTitle =
        week.puzzle && typeof week.puzzle === 'object' && typeof week.puzzle.title === 'string'
          ? week.puzzle.title
          : '';
      const attachedMatchingId = typeof week.matchingId === 'string' ? week.matchingId : null;
      const attachedMatchingTitle =
        week.matching && typeof week.matching === 'object' && typeof week.matching.title === 'string'
          ? week.matching.title
          : '';
      setGameType(nextGameType);
      setPuzzleId(attachedPuzzleId);
      setPuzzleTitle(attachedPuzzleTitle);
      setMatchingId(attachedMatchingId);
      setMatchingTitle(attachedMatchingTitle);
      const gameLabel =
        nextGameType === 'MATCHING'
          ? attachedMatchingTitle
            ? `match “${attachedMatchingTitle}”`
            : 'match game'
          : attachedPuzzleTitle
            ? `puzzle “${attachedPuzzleTitle}”`
            : 'puzzle';
      setMessage(`Editing Week ${weekNumber} · ${gameLabel}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load week');
    }
  }

  function startNewWeek() {
    const maxWeek = weeks.reduce((max, w) => Math.max(max, w.weekNumber), 0);
    const nextNum = maxWeek + 1;
    setForm({
      weekNumber: nextNum,
      title: '',
      scripture: '',
      content: '',
      declarationText: 'I declare: I am a child of God, walking in faith and obedience to His Word.',
    });
    setVideos(defaultVideosForWeek(nextNum));
    setQuestions([blankQuestion()]);
    setGameType('PUZZLE');
    setPuzzleId(null);
    setPuzzleTitle('');
    setMatchingId(null);
    setMatchingTitle('');
    setMessage('');
    setError('');
    setStep(0);
    setDraftAt(null);
    setDraftNote('');
    localStorage.removeItem(draftKey);
  }

  function duplicateQuestion(qi: number) {
    const q = questions[qi];
    const dup: ObjQuestion = {
      ...q,
      id: newId('q'),
      options: [...q.options],
      acceptedAnswers: [...q.acceptedAnswers],
    };
    const next = [...questions];
    next.splice(qi + 1, 0, dup);
    setQuestions(next);
  }

  function setQuestionType(qi: number, type: ObjQuestionType) {
    const next = [...questions];
    const q = next[qi];
    next[qi] = {
      ...q,
      type,
      acceptedAnswers: type === 'FILL_BLANK' ? (q.acceptedAnswers.length ? q.acceptedAnswers : ['']) : [],
      options: type === 'MULTIPLE_CHOICE' ? q.options : (['', '', '', ''] as [string, string, string, string]),
      answerIndex: type === 'MULTIPLE_CHOICE' ? Math.max(0, q.answerIndex) : -1,
    };
    setQuestions(next);
  }

  function moveQuestion(qi: number, dir: -1 | 1) {
    const target = qi + dir;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    const [removed] = next.splice(qi, 1);
    next.splice(target, 0, removed);
    setQuestions(next);
  }

  function updateVideo(index: number, field: keyof QuestVideo, value: string) {
    const updated = [...videos];
    updated[index] = { ...updated[index], [field]: value };
    setVideos(updated);
  }

  function setTakeaway(videoIndex: number, itemIndex: number, value: string) {
    const updated = [...videos];
    const items = [...(updated[videoIndex].takeaways ?? [])];
    items[itemIndex] = value;
    updated[videoIndex] = { ...updated[videoIndex], takeaways: items.slice(0, 10) };
    setVideos(updated);
  }

  function addTakeaway(videoIndex: number) {
    const items = videos[videoIndex].takeaways ?? [];
    if (items.length >= 10) return;
    const updated = [...videos];
    updated[videoIndex] = { ...updated[videoIndex], takeaways: [...items, ''] };
    setVideos(updated);
  }

  function removeTakeaway(videoIndex: number, itemIndex: number) {
    const updated = [...videos];
    const items = [...(updated[videoIndex].takeaways ?? [])];
    items.splice(itemIndex, 1);
    updated[videoIndex] = { ...updated[videoIndex], takeaways: items };
    setVideos(updated);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    setBusy(true);

    const objectiveQuiz = questions
      .filter((q) => {
        if (!q.question.trim()) return false;
        if (q.type === 'FILL_BLANK') return q.acceptedAnswers.some((a) => a.trim());
        return q.options.some((o) => o.trim());
      })
      .map((q) =>
        q.type === 'FILL_BLANK'
          ? {
              id: q.id,
              type: 'FILL_BLANK' as const,
              question: q.question.trim(),
              options: [] as string[],
              answerIndex: -1,
              acceptedAnswers: q.acceptedAnswers.map((a) => a.trim()).filter(Boolean),
              points: Number(q.points) || 10,
            }
          : {
              id: q.id,
              type: 'MULTIPLE_CHOICE' as const,
              question: q.question.trim(),
              options: [...q.options],
              answerIndex: q.answerIndex,
              acceptedAnswers: [] as string[],
              points: Number(q.points) || 10,
            },
      );

    const cleanVideos = videos.map((v, i) => ({
      id: v.id || `v-${form.weekNumber}-${i + 1}`,
      partNumber: i + 1,
      title: v.title.trim() || `Part ${i + 1} Video`,
      subtitle: v.subtitle?.trim() || 'Watched',
      duration: v.duration?.trim() || '5:00',
      videoUrl: v.videoUrl.trim() || 'https://www.youtube.com',
      takeaways: (v.takeaways ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 10),
    }));

    try {
      await api('/api/teen-quest/admin/weeks', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: Number(form.weekNumber),
          title: form.title,
          scripture: form.scripture,
          content: form.content,
          declarationText: form.declarationText.trim(),
          videos: cleanVideos,
          objectiveQuiz,
          gameType,
          puzzleId: gameType === 'PUZZLE' ? puzzleId : null,
          matchingId: gameType === 'MATCHING' ? matchingId : null,
        }),
      });
      localStorage.removeItem(draftKey);
      localStorage.removeItem(draftStorageKey());
      setDraftNote('Saved');
      setDraftAt(Date.now());
      navigate(`/app/dashboard/quests?highlight=${form.weekNumber}`, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save quest');
    } finally {
      setBusy(false);
    }
  }

  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  const wordCount = form.content.trim() ? form.content.trim().split(/\s+/).length : 0;

  if (!ready) {
    return <Spinner label="Opening the quest editor…" />;
  }

  const steps = ['Lesson', 'Videos', 'Quiz', questGameStepLabel(gameType), 'Review'] as const;

  return (
    <div className="quest-editor mx-auto flex max-w-6xl flex-col gap-6 pb-12">
      <header className="quest-editor-header">
        <div className="quest-editor-heading">
          <button type="button" onClick={() => navigate('/app/dashboard/quests')} className="quest-editor-backlink">← Quest weeks</button>
          <h1>{form.title.trim().toLowerCase().startsWith(`week ${form.weekNumber}`)
            ? form.title.trim()
            : `Week ${form.weekNumber}${form.title.trim() ? ` · ${form.title.trim()}` : ''}`}</h1>
        </div>
        <div className="quest-editor-actions">
          <span className="quest-editor-save" title="Drafts are saved on this device until you save the quest." role="status" aria-live="polite">
            <span aria-hidden="true" className="quest-editor-save-dot" />
            {draftNote && draftAt ? `${draftNote} · ${new Date(draftAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Draft saves as you work'}
          </span>
          {step > 0 && <button type="button" onClick={() => setStep(current => Math.max(0, current - 1))} className="quest-editor-previous">Back</button>}
          {step < steps.length - 1 && <Button type="button" onClick={() => setStep(current => Math.min(steps.length - 1, current + 1))}>Next: {steps[step + 1]} <span aria-hidden="true">→</span></Button>}
        </div>
      </header>
      <nav className="quest-editor-steps" aria-label="Quest editing steps">
        {steps.map((label, index) => <button key={label} type="button" aria-current={index === step ? 'step' : undefined} onClick={() => setStep(index)}>
          <span className="quest-editor-step-number" aria-hidden="true">{index + 1}</span>{label}
        </button>)}
      </nav>

      {/* Main Studio Workspace */}
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Column: Authoring Sections */}
          <div className={step === 4 ? 'hidden' : 'lg:col-span-12 flex flex-col gap-6'}>
            <section id="section-declaration" className={step === 0 ? 'quest-lesson-layout' : 'hidden'} aria-label="Lesson editor">
              <div className="quest-lesson-writing">
                <div className="quest-lesson-section-heading">
                  <h2>Lesson</h2>
                  <span>{wordCount} {wordCount === 1 ? 'word' : 'words'} · {Math.max(1, Math.ceil(wordCount / 130))} min read</span>
                </div>
                <label htmlFor="quest-lesson-title">Lesson title</label>
                <input id="quest-lesson-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Be Strong and Courageous" required />
                <label htmlFor="quest-lesson-body">Teaching &amp; reflection</label>
                <textarea id="quest-lesson-body" className="quest-lesson-body" rows={15} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Write the weekly teaching and scripture reflection…" required />
              </div>
              <aside className="quest-lesson-details" aria-label="Week details">
                <h2>Week details</h2>
                <div className="quest-lesson-field">
                  <label htmlFor="quest-week-number">Week number</label>
                  <input id="quest-week-number" className="quest-week-number" type="number" min={1} value={form.weekNumber} onChange={e => setForm({ ...form, weekNumber: Number(e.target.value) })} required />
                </div>
                <div className="quest-lesson-field">
                  <label htmlFor="quest-scripture">Scripture reading</label>
                  <textarea id="quest-scripture" rows={3} value={form.scripture} onChange={e => setForm({ ...form, scripture: e.target.value })} placeholder="e.g. Genesis 1–8" required />
                </div>
                <div className="quest-lesson-field quest-declaration-field">
                  <label htmlFor="quest-declaration">Word declaration</label>
                  <textarea id="quest-declaration" rows={6} value={form.declarationText} onChange={e => setForm({ ...form, declarationText: e.target.value })} placeholder="I declare: I am strong and courageous…" required />
                </div>
              </aside>
            </section>

            {/* Section 2: Exactly 3 Weekly Video Lessons */}
            <section
              id="section-videos"
              className={step === 1 ? 'flex flex-col gap-5' : 'hidden'}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Videos</h2>
                <span className="text-[11px] text-muted">3 parts</span>
              </div>

              {/* 3 Video Cards */}
              <div className="flex flex-col gap-4">
                {videos.map((vid, idx) => (
                  <div
                    key={vid.id || idx}
                    className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-md bg-navy text-[11px] font-semibold text-gold">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="text-sm font-semibold text-navy">Part {idx + 1}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-7 flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-navy tracking-wider">
                          Part {idx + 1} Title
                        </label>
                        <input
                          className="w-full rounded-lg border border-border bg-cream px-3 py-2 text-xs font-medium text-navy placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-teal"
                          value={vid.title}
                          onChange={(e) => updateVideo(idx, 'title', e.target.value)}
                          placeholder={`e.g. Part ${idx + 1}: Deborah's Calling under the Palm`}
                          required
                        />
                      </div>

                      <div className="sm:col-span-3 flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-navy tracking-wider">
                          Duration
                        </label>
                        <input
                          className="w-full rounded-lg border border-border bg-cream px-3 py-2 text-xs font-medium text-navy placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-teal"
                          value={vid.duration || ''}
                          onChange={(e) => updateVideo(idx, 'duration', e.target.value)}
                          placeholder="e.g. 4:30"
                        />
                      </div>

                      <div className="sm:col-span-2 flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-navy tracking-wider">
                          Subtitle
                        </label>
                        <input
                          className="w-full rounded-lg border border-border bg-cream px-3 py-2 text-xs font-medium text-navy placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-teal"
                          value={vid.subtitle || ''}
                          onChange={(e) => updateVideo(idx, 'subtitle', e.target.value)}
                          placeholder="Watched"
                        />
                      </div>

                      <div className="sm:col-span-12 flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-navy tracking-wider flex items-center justify-between">
                          <span>YouTube / Streaming Video URL</span>
                          {vid.videoUrl ? (
                            <a
                              href={vid.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-teal font-semibold hover:underline"
                            >
                              Test Video Link ↗
                            </a>
                          ) : null}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-xs">▶️</span>
                          <input
                            className="w-full rounded-lg border border-border bg-cream pl-8 pr-3 py-2 text-xs text-navy font-mono placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-teal"
                            value={vid.videoUrl}
                            onChange={(e) => updateVideo(idx, 'videoUrl', e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            required
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-12 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase text-navy tracking-wider">
                            Things to expect
                          </label>
                          <span className="text-[10px] font-semibold text-muted">
                            {(vid.takeaways ?? []).length}/10
                          </span>
                        </div>
                        {(vid.takeaways ?? []).map((item, itemIndex) => (
                          <div key={itemIndex} className="flex items-center gap-2">
                            <input
                              className="w-full rounded-lg border border-border bg-cream px-3 py-2 text-xs text-navy placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-teal"
                              value={item}
                              onChange={(e) => setTakeaway(idx, itemIndex, e.target.value)}
                              placeholder={`Expectation ${itemIndex + 1}`}
                              maxLength={280}
                            />
                            <button
                              type="button"
                              className="px-2 py-1 rounded-lg border border-border text-[11px] font-semibold text-navy cursor-pointer"
                              onClick={() => removeTakeaway(idx, itemIndex)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          disabled={(vid.takeaways ?? []).length >= 10}
                          className="self-start px-3 py-1.5 rounded-lg border border-dashed border-border text-xs font-semibold text-navy cursor-pointer disabled:opacity-40"
                          onClick={() => addTakeaway(idx)}
                        >
                          Add expectation
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 3: Objective Quiz Builder — choose type when adding */}
            <section
              id="section-quiz"
              className={step === 2 ? 'flex flex-col gap-5' : 'hidden'}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  {questions.length === 0
                    ? 'Quiz · mix types in one quiz'
                    : (() => {
                        const mc = questions.filter((q) => q.type === 'MULTIPLE_CHOICE').length;
                        const fb = questions.filter((q) => q.type === 'FILL_BLANK').length;
                        const parts = [
                          `${questions.length}`,
                          mc ? `${mc} multiple choice` : null,
                          fb ? `${fb} fill blank` : null,
                          `${totalPoints} pts`,
                        ].filter(Boolean);
                        return `Quiz · ${parts.join(' · ')}`;
                      })()}
                </h2>
                {questions.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Add multiple-choice question"
                      className="cursor-pointer rounded-full border border-border bg-cream px-3 py-1 text-xs font-semibold text-navy hover:border-teal hover:text-teal"
                      onClick={() => setQuestions([blankQuestion('MULTIPLE_CHOICE'), ...questions])}
                    >
                      + Multiple choice
                    </button>
                    <Button size="sm" type="button"
                      aria-label="Add fill-in-the-blank question"
                       
                      onClick={() => setQuestions([blankQuestion('FILL_BLANK'), ...questions])}
                    >
                      + Fill in the blank
                    </Button>
                  </div>
                ) : null}
              </div>

              {questions.length === 0 ? (
                <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-cream/50 p-5">
                  <p className="m-0 text-sm font-semibold text-navy">Add the first question — pick any type</p>
                  <p className="m-0 text-xs text-muted">
                    One week’s quiz can include both multiple choice and fill in the blank. Use the buttons above to keep adding either kind.
                  </p>
                  <div className="mt-1 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      aria-label="Create a multiple-choice question"
                      className="flex cursor-pointer flex-col items-start gap-1 rounded-2xl border border-border bg-surface px-4 py-4 text-left hover:border-teal"
                      onClick={() => setQuestions([blankQuestion('MULTIPLE_CHOICE')])}
                    >
                      <span className="text-sm font-bold text-navy">Multiple choice</span>
                      <span className="text-xs text-muted">Four options — tap the letter for the correct answer.</span>
                    </button>
                    <Button className="flex flex-col items-start gap-1 rounded-2xl text-left hover:border-teal" type="button"
                      aria-label="Create a fill-in-the-blank question"
                       
                      onClick={() => setQuestions([blankQuestion('FILL_BLANK')])}
                    >
                      <span className="text-sm font-bold">Fill in the blank</span>
                      <span className="text-xs text-white/75">Teens type the answer — add alternate spellings if you want.</span>
                    </Button>
                  </div>
                </div>
              ) : null}

              {/* Questions Stack */}
              <div className="flex flex-col gap-3">
                {questions.map((q, qi) => (
                  <div
                    key={q.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold tabular-nums text-muted">{qi + 1}</span>
                      <select
                        value={q.type}
                        onChange={(e) => setQuestionType(qi, e.target.value as ObjQuestionType)}
                        aria-label={`Type for question ${qi + 1}`}
                        className="rounded-full border border-border bg-cream px-2.5 py-1 text-[11px] font-bold text-navy focus:border-teal focus:outline-none"
                      >
                        <option value="MULTIPLE_CHOICE">{quizTypeLabel('MULTIPLE_CHOICE')}</option>
                        <option value="FILL_BLANK">{quizTypeLabel('FILL_BLANK')}</option>
                      </select>
                      <div className="ml-auto flex shrink-0 items-center gap-0.5">
                        <label className="mr-1 flex items-center gap-1 text-[11px] text-muted">
                          <input
                            className="w-8 bg-transparent text-center text-sm font-bold tabular-nums text-navy [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            type="number"
                            min={1}
                            value={q.points}
                            onChange={(e) => {
                              const next = [...questions];
                              next[qi] = { ...q, points: Number(e.target.value) };
                              setQuestions(next);
                            }}
                            aria-label={`Points for question ${qi + 1}`}
                          />
                          pts
                        </label>
                        {questions.length > 1 ? (
                          <>
                            <button
                              type="button"
                              disabled={qi === 0}
                              onClick={() => moveQuestion(qi, -1)}
                              aria-label="Move question up"
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-cream hover:text-navy disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              disabled={qi === questions.length - 1}
                              onClick={() => moveQuestion(qi, 1)}
                              aria-label="Move question down"
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-cream hover:text-navy disabled:opacity-30"
                            >
                              ↓
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => duplicateQuestion(qi)}
                          aria-label="Duplicate question"
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-cream hover:text-navy"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <rect x="9" y="9" width="11" height="11" rx="2" />
                            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          aria-label="Remove question"
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-error-bg hover:text-error"
                          onClick={() => setQuestions(questions.filter((_, i) => i !== qi))}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <input
                      className="w-full bg-transparent py-1 text-sm font-semibold text-navy placeholder:font-normal placeholder:text-muted/45 focus:outline-none"
                      value={q.question}
                      onChange={(e) => {
                        const next = [...questions];
                        next[qi] = { ...q, question: e.target.value };
                        setQuestions(next);
                      }}
                      placeholder={
                        q.type === 'FILL_BLANK'
                          ? 'Write the prompt — use _____ for the blank'
                          : 'Write the question'
                      }
                      aria-label={`Question ${qi + 1}`}
                    />

                    {q.type === 'FILL_BLANK' ? (
                      <div className="flex flex-col gap-1.5">
                        <p className="m-0 text-[11px] text-muted">
                          Accepted answers (any match counts; grading ignores case and extra spaces)
                        </p>
                        {q.acceptedAnswers.map((ans, ai) => (
                          <div key={ai} className="flex items-center gap-2 rounded-xl bg-teal-tint/50 px-2 py-1.5">
                            <span className="text-[11px] font-bold text-teal">OK</span>
                            <input
                              className="min-w-0 flex-1 bg-transparent py-1 text-sm text-navy placeholder:text-muted/45 focus:outline-none"
                              value={ans}
                              onChange={(e) => {
                                const acceptedAnswers = [...q.acceptedAnswers];
                                acceptedAnswers[ai] = e.target.value;
                                const next = [...questions];
                                next[qi] = { ...q, acceptedAnswers };
                                setQuestions(next);
                              }}
                              placeholder={ai === 0 ? 'Correct answer' : 'Alternate spelling'}
                              aria-label={`Accepted answer ${ai + 1} for question ${qi + 1}`}
                            />
                            {q.acceptedAnswers.length > 1 ? (
                              <button
                                type="button"
                                aria-label="Remove accepted answer"
                                className="cursor-pointer rounded-md px-1.5 text-xs font-bold text-muted hover:text-error"
                                onClick={() => {
                                  const acceptedAnswers = q.acceptedAnswers.filter((_, i) => i !== ai);
                                  const next = [...questions];
                                  next[qi] = { ...q, acceptedAnswers };
                                  setQuestions(next);
                                }}
                              >
                                ×
                              </button>
                            ) : null}
                          </div>
                        ))}
                        {q.acceptedAnswers.length < 8 ? (
                          <button
                            type="button"
                            className="cursor-pointer self-start text-[11px] font-semibold text-teal hover:underline"
                            onClick={() => {
                              const next = [...questions];
                              next[qi] = { ...q, acceptedAnswers: [...q.acceptedAnswers, ''] };
                              setQuestions(next);
                            }}
                          >
                            + Add alternate answer
                          </button>
                        ) : null}
                      </div>
                    ) : (
                    <div className="flex flex-col gap-1.5">
                      {q.options.map((opt, oi) => {
                        const isCorrect = q.answerIndex === oi;
                        const optionLetter = String.fromCharCode(65 + oi);
                        return (
                          <div
                            key={oi}
                            className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${
                              isCorrect ? 'bg-teal-tint' : 'bg-cream'
                            }`}
                          >
                            <button
                              type="button"
                              aria-label={`Mark ${optionLetter} as the correct answer`}
                              aria-pressed={isCorrect}
                              onClick={() => {
                                const next = [...questions];
                                next[qi] = { ...q, answerIndex: oi };
                                setQuestions(next);
                              }}
                              className={`flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[11px] font-bold ${
                                isCorrect ? 'bg-teal text-white' : 'bg-white text-navy ring-1 ring-border'
                              }`}
                            >
                              {optionLetter}
                            </button>
                            <input
                              className="min-w-0 flex-1 bg-transparent py-1 text-sm text-navy placeholder:text-muted/45 focus:outline-none"
                              value={opt}
                              onChange={(e) => {
                                const options = [...q.options] as [string, string, string, string];
                                options[oi] = e.target.value;
                                const next = [...questions];
                                next[qi] = { ...q, options };
                                setQuestions(next);
                              }}
                              placeholder={`Answer ${optionLetter}`}
                              aria-label={`Answer ${optionLetter} for question ${qi + 1}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Section 4: Choose puzzle (crossword) or match game */}
            <section
              id="section-puzzle"
              className={step === 3 ? 'flex flex-col gap-5' : 'hidden'}
            >
              <div className="flex flex-col gap-2">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Game for this week
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGameType('PUZZLE');
                      setMatchingId(null);
                      setMatchingTitle('');
                    }}
                    className={`cursor-pointer rounded-xl border px-3 py-3 text-left ${
                      gameType === 'PUZZLE'
                        ? 'border-navy bg-navy text-white'
                        : 'border-border bg-surface text-navy hover:bg-cream'
                    }`}
                  >
                    <strong className="block text-xs">Puzzle</strong>
                    <span className={`mt-0.5 block text-[11px] ${gameType === 'PUZZLE' ? 'text-white/80' : 'text-muted'}`}>
                      Scripture crossword from Puzzle Studio
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGameType('MATCHING');
                      setPuzzleId(null);
                      setPuzzleTitle('');
                    }}
                    className={`cursor-pointer rounded-xl border px-3 py-3 text-left ${
                      gameType === 'MATCHING'
                        ? 'border-navy bg-navy text-white'
                        : 'border-border bg-surface text-navy hover:bg-cream'
                    }`}
                  >
                    <strong className="block text-xs">Match</strong>
                    <span className={`mt-0.5 block text-[11px] ${gameType === 'MATCHING' ? 'text-white/80' : 'text-muted'}`}>
                      Pair / line game from Match Studio
                    </span>
                  </button>
                </div>
              </div>

              {gameType === 'PUZZLE' ? (
                puzzleId ? (
                  <div className="flex flex-col gap-3">
                    <h2 className="text-base font-semibold text-navy">{puzzleTitle || 'Selected puzzle'}</h2>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" type="button" onClick={() => navigate(arrangementHref(puzzleId, form.weekNumber))}>
                        Edit word arrangement
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          setPuzzleId(null);
                          setPuzzleTitle('');
                        }}
                        className="cursor-pointer rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-navy hover:bg-cream"
                      >
                        Choose another
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="rounded-2xl border border-dashed border-border bg-cream/50 px-4 py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h2 className="m-0 text-sm font-bold text-navy">No puzzle for this week yet</h2>
                        <p className="m-0 mt-1 text-xs text-muted">
                          Each quest week has exactly one puzzle. Create a new one, or attach a LIVE puzzle that is not already used on another week.
                        </p>
                      </div>
                      <Button className="shrink-0" type="button" onClick={() => navigate(createPuzzleHref(form.weekNumber, form.title))}>
                        + Create new puzzle
                      </Button>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-muted">
                          Existing LIVE puzzles
                        </p>
                        <button
                          type="button"
                          onClick={() => loadLivePuzzles(form.weekNumber)}
                          className="cursor-pointer bg-transparent p-0 text-[11px] font-semibold text-teal"
                        >
                          Refresh
                        </button>
                      </div>
                      {livePuzzlesLoading ? (
                        <Spinner />
                      ) : livePuzzlesError ? (
                        <Alert kind="error">{livePuzzlesError}</Alert>
                      ) : livePuzzles.length === 0 ? (
                        <p className="m-0 text-xs text-muted rounded-xl border border-border bg-surface px-3 py-3">
                          No LIVE puzzles yet. Create one above, then Publish and Promote to LIVE in Studio.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {livePuzzles.map((p) => {
                            const id = p.puzzleId || '';
                            if (!id) return null;
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => {
                                  setPuzzleId(id);
                                  setPuzzleTitle(p.title);
                                }}
                                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left hover:bg-cream"
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-navy truncate">{p.title}</div>
                                  <div className="text-[10px] text-muted truncate">{p.puzzleKey}</div>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-forest bg-sage px-2 py-0.5 rounded-full shrink-0">
                                  LIVE
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )
              ) : matchingId ? (
                <div className="flex flex-col gap-3">
                  <h2 className="text-base font-semibold text-navy">{matchingTitle || 'Selected match'}</h2>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" type="button" onClick={() => navigate(createMatchHref(form.weekNumber))}>
                      Open Match Studio
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setMatchingId(null);
                        setMatchingTitle('');
                      }}
                      className="cursor-pointer rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-navy hover:bg-cream"
                    >
                      Choose another
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-dashed border-border bg-cream/50 px-4 py-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="m-0 text-sm font-bold text-navy">No match game for this week yet</h2>
                      <p className="m-0 mt-1 text-xs text-muted">
                        Create one in Match Studio, or attach an existing LIVE match below.
                      </p>
                    </div>
                    <Button className="shrink-0" type="button" onClick={() => navigate(createMatchHref(form.weekNumber))}>
                      + Create match game
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="m-0 text-[11px] font-semibold uppercase tracking-wider text-muted">
                        Existing LIVE match games
                      </p>
                      <button
                        type="button"
                        onClick={() => loadLiveMatchings(form.weekNumber)}
                        className="cursor-pointer bg-transparent p-0 text-[11px] font-semibold text-teal"
                      >
                        Refresh
                      </button>
                    </div>
                    {liveMatchingsLoading ? (
                      <Spinner />
                    ) : liveMatchingsError ? (
                      <Alert kind="error">{liveMatchingsError}</Alert>
                    ) : liveMatchings.length === 0 ? (
                      <p className="m-0 text-xs text-muted rounded-xl border border-border bg-surface px-3 py-3">
                        No LIVE match games yet. Publish and promote one in Match Studio.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {liveMatchings.map((m) => {
                          const id = m.matchingId || '';
                          if (!id) return null;
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => {
                                setMatchingId(id);
                                setMatchingTitle(m.title);
                              }}
                              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left hover:bg-cream"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-navy truncate">{m.title}</div>
                                <div className="text-[10px] text-muted truncate">{m.matchingKey}</div>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-forest bg-sage px-2 py-0.5 rounded-full shrink-0">
                                LIVE
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>

          {/* Right Column: Sticky Publishing & Interactive Mobile Preview */}
          <div className={step === 4 ? 'lg:col-span-12 flex flex-col gap-6' : 'hidden'}>
            {/* Save & Publish Action Card */}
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Review</h2>
                <span className="text-sm font-semibold tabular-nums text-navy">{totalPoints} pts</span>
              </div>

              {/* Summary Checklist */}
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted">3 Video Lessons</span>
                  <span className="font-bold text-forest">
                    {videos.filter((v) => v.videoUrl.trim()).length} / 3 URLs Ready
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted">1 Objective Quiz</span>
                  <span className="font-bold text-navy">
                    {questions.filter((q) => q.question.trim()).length} / {questions.length} questions
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted">
                    1 {gameType === 'MATCHING' ? 'Match' : 'Puzzle'} Game
                  </span>
                  <span
                    className={`font-bold ${
                      (gameType === 'MATCHING' ? matchingId : puzzleId) ? 'text-teal' : 'text-orange'
                    }`}
                  >
                    {gameType === 'MATCHING'
                      ? matchingId
                        ? matchingTitle || 'Attached'
                        : 'Not attached'
                      : puzzleId
                        ? puzzleTitle || 'Attached'
                        : 'Not attached'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border/40 py-1">
                  <span className="text-muted">Word declaration</span>
                  <span className={`font-semibold ${form.declarationText.trim() ? 'text-forest' : 'text-orange'}`}>
                    {form.declarationText.trim() ? 'Written' : 'Missing'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted">Lesson body</span>
                  <span className="font-semibold text-navy">
                    {wordCount > 0 ? `${wordCount} words` : <span className="text-orange">Required</span>}
                  </span>
                </div>
              </div>

              {error ? <Alert kind="error">{error}</Alert> : null}
              {message ? <Alert kind="ok">{message}</Alert> : null}

              <Button size="lg" className="w-full" type="submit"
                disabled={busy}>
                {busy ? 'Saving quest week…' : 'Save quest week'}
              </Button>

              <button
                type="button"
                onClick={startNewWeek}
                className="w-full py-2 px-3 rounded-xl border border-border bg-cream hover:bg-surface-2 text-navy text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                Clear & Start New Week
              </button>
            </div>

            {/* Mobile App Live Preview Card (EXACT MATCH TO APP SCREENSHOT) */}
            <div className="hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">📱</span>
                  <span className="text-xs font-bold text-navy">Mobile Quest Screen</span>
                </div>
                <span className="text-[10px] font-semibold uppercase text-teal bg-teal-tint px-2 py-0.5 rounded-full">
                  Live Sync
                </span>
              </div>

              {/* Realistic Mobile Mockup Shell */}
              <div className="bg-[#10192B] rounded-3xl p-3 shadow-xl border-4 border-[#1E293B] flex flex-col gap-2">
                {/* Phone Status Bar */}
                <div className="flex items-center justify-between text-[10px] text-white/70 px-2 pt-0.5 pb-1">
                  <span className="font-bold">9:41</span>
                  <div className="w-16 h-3 bg-black/60 rounded-full mx-auto" />
                  <div className="flex items-center gap-1">
                    <span>5G</span>
                    <span className="text-[10px]">100%</span>
                  </div>
                </div>

                {/* Mobile Screen Surface */}
                <div className="bg-[#F8F9FA] rounded-2xl p-3 flex flex-col gap-3 text-navy max-h-[520px] overflow-y-auto">
                  {/* Top Explorer Hero Card (Matching Mobile Screenshot) */}
                  <div className="bg-[#FFF8F0] rounded-2xl p-3.5 border border-[#FBEAD2] flex items-center justify-between relative overflow-hidden shadow-2xs">
                    <div className="flex flex-col z-10 max-w-[65%]">
                      <h4 className="text-base font-extrabold text-[#1B2A4A] tracking-tight leading-tight">
                        Hey, Explorer!
                      </h4>
                      <p className="text-[11px] text-[#4A5568] mt-1 leading-snug">
                        Ready for today's adventure in God's Word?
                      </p>
                    </div>

                    {/* Stylized Explorer Characters Graphic */}
                    <div className="relative w-20 h-16 shrink-0 flex items-center justify-end">
                      {/* Girl Explorer */}
                      <div className="w-10 h-10 rounded-full bg-emerald-700 border-2 border-white shadow-xs flex items-center justify-center text-white text-xs font-bold -mr-2 z-10 overflow-hidden">
                        <span className="text-sm">👧🏾</span>
                      </div>
                      {/* Boy Explorer with Glasses */}
                      <div className="w-11 h-11 rounded-full bg-amber-600 border-2 border-white shadow-xs flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                        <span className="text-sm">👦🏾</span>
                      </div>
                    </div>
                  </div>

                  {/* Today's Quest Section Header */}
                  <div className="flex flex-col gap-0.5 px-0.5">
                    <h5 className="text-sm font-bold text-[#1B2A4A]">Today's Quest</h5>
                    <p className="text-xs text-[#718096] font-medium">
                      {form.title || 'Be Strong and Courageous'}
                    </p>
                  </div>

                  {/* 1. Part 1 Video Row */}
                  <div
                    onClick={() => setExpandedPreviewItem(expandedPreviewItem === 'video1' ? null : 'video1')}
                    className="p-3 rounded-2xl bg-white border border-[#F6EFE9] shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-2.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#E8F8F0] border border-[#C6EBD7] text-forest flex items-center justify-center text-xs font-extrabold shrink-0">
                        ✓
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-[#1B2A4A] truncate">
                          {videos[0]?.title || "Part 1: Deborah's Calling under the Palm"}
                        </span>
                        <span className="text-[10px] text-[#718096] font-medium">
                          {videos[0]?.subtitle || 'Watched'}
                        </span>
                      </div>
                    </div>
                    <span className="text-muted text-xs shrink-0">›</span>
                  </div>

                  {/* 2. Part 2 Video Row */}
                  <div className="p-3 rounded-2xl bg-white border border-[#F6EFE9] shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-2.5 cursor-pointer">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#E8F8F0] border border-[#C6EBD7] text-forest flex items-center justify-center text-xs font-extrabold shrink-0">
                        ✓
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-[#1B2A4A] truncate">
                          {videos[1]?.title || 'Part 2: Barak & 10,000 Men at Mt. Tabor'}
                        </span>
                        <span className="text-[10px] text-[#718096] font-medium">
                          {videos[1]?.subtitle || 'Watched'}
                        </span>
                      </div>
                    </div>
                    <span className="text-muted text-xs shrink-0">›</span>
                  </div>

                  {/* 3. Part 3 Video Row */}
                  <div className="p-3 rounded-2xl bg-white border border-[#F6EFE9] shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-2.5 cursor-pointer">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#E8F8F0] border border-[#C6EBD7] text-forest flex items-center justify-center text-xs font-extrabold shrink-0">
                        ✓
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-[#1B2A4A] truncate">
                          {videos[2]?.title || "Part 3: Jael's Tent Peg & Song of Victory"}
                        </span>
                        <span className="text-[10px] text-[#718096] font-medium">
                          {videos[2]?.subtitle || 'Watched'}
                        </span>
                      </div>
                    </div>
                    <span className="text-muted text-xs shrink-0">›</span>
                  </div>

                  {/* 4. Quiz Row (Matching Screenshot) */}
                  <div
                    onClick={() => setExpandedPreviewItem(expandedPreviewItem === 'quiz' ? null : 'quiz')}
                    className="p-3 rounded-2xl bg-white border border-[#F6EFE9] shadow-2xs hover:shadow-xs transition-all flex flex-col gap-2 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#2E384D]/10 border border-[#2E384D]/20 text-[#2E384D] flex items-center justify-center text-xs font-extrabold shrink-0">
                          ❔
                        </div>
                        <span className="text-xs font-bold text-[#1B2A4A]">Quiz</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-teal bg-teal-tint px-1.5 py-0.5 rounded">
                          +{totalPoints} XP
                        </span>
                        <span className="text-muted text-xs">›</span>
                      </div>
                    </div>

                    {/* Interactive Quiz Preview expansion */}
                    {expandedPreviewItem === 'quiz' && questions.length > 0 && (
                      <div className="mt-1 pt-2 border-t border-border/50 flex flex-col gap-2">
                        <p className="text-[11px] font-bold text-navy">
                          {questions[0].question || 'Quiz question preview'}
                        </p>
                        <div className="flex flex-col gap-1">
                          {questions[0].options.map((opt, oi) => {
                            const isPicked = previewAnswer === oi;
                            const isCorrect = questions[0].answerIndex === oi;
                            return (
                              <button
                                key={oi}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewAnswer(oi);
                                }}
                                className={`text-left p-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                                  isPicked
                                    ? isCorrect
                                      ? 'bg-forest/15 border-forest text-forest font-bold'
                                      : 'bg-error-bg border-error/50 text-error'
                                    : 'bg-cream border-border text-navy'
                                }`}
                              >
                                {opt || `Option ${oi + 1}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. Puzzle Row (Matching Screenshot) */}
                  <div
                    onClick={() => setExpandedPreviewItem(expandedPreviewItem === 'puzzle' ? null : 'puzzle')}
                    className="p-3 rounded-2xl bg-white border border-[#F6EFE9] shadow-2xs hover:shadow-xs transition-all flex flex-col gap-2 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-teal-tint border border-teal/20 text-teal flex items-center justify-center text-xs font-extrabold shrink-0">
                          🧩
                        </div>
                        <span className="text-xs font-bold text-[#1B2A4A]">Puzzle</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-teal bg-teal-tint px-1.5 py-0.5 rounded uppercase">
                          {puzzleId ? puzzleTitle || 'Attached puzzle' : 'No puzzle attached'}
                        </span>
                        <span className="text-muted text-xs">›</span>
                      </div>
                    </div>

                    {expandedPreviewItem === 'puzzle' && (
                      <div className="mt-1 pt-2 border-t border-border/50 flex flex-col gap-1 text-[11px] text-muted">
                        <span className="font-semibold text-navy">{puzzleTitle}</span>
                        <span>Solved via TBA Puzzle Studio solver</span>
                      </div>
                    )}
                  </div>

                  {/* 6. Word Declaration Bottom Card (Matching Mobile Screenshot) */}
                  <div className="p-3.5 rounded-2xl bg-white border border-[#F6EFE9] shadow-2xs flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base text-orange">💬</span>
                        <span className="text-xs font-extrabold text-[#1B2A4A]">Word Declaration</span>
                      </div>
                      <span className="text-[10px] font-bold text-orange bg-orange/10 px-2 py-0.5 rounded-full border border-orange/20">
                        0/10
                      </span>
                    </div>

                    <p className="text-[11px] text-[#2D3748] font-medium leading-relaxed">
                      {form.declarationText ||
                        'I declare: I am strong and courageous. The Lord my God is with me wherever I go.'}
                    </p>

                    {/* Golden Progress Bar */}
                    <div className="w-full bg-[#F3E7D6] h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#E29B4A] h-full w-[10%]" />
                    </div>

                    <div className="text-[10px] font-bold text-[#718096] flex items-center justify-between pt-0.5">
                      <span>— {form.scripture || 'Joshua 1:9'} · 0/10</span>
                      <span className="text-orange font-extrabold uppercase">Tap</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
