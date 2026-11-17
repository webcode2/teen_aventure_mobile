import { Button } from './ui';

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

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function blankQuestion(type: ObjQuestionType = 'MULTIPLE_CHOICE'): ObjQuestion {
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

export function normalizeQuestion(raw: Partial<ObjQuestion> & { id?: string }): ObjQuestion {
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

export function serializeQuizQuestions(questions: ObjQuestion[]) {
  return questions
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
}

export function ObjectiveQuizQuestions({ questions, setQuestions }: {
  questions: ObjQuestion[];
  setQuestions: (questions: ObjQuestion[]) => void;
}) {
  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

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

  return (
    <>
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
            A quiz can include both multiple choice and fill-in-the-blank questions.
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
    </>
  );
}
