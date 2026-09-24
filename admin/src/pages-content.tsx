import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { api } from './api';
import { Alert, PageHeader } from './ui';

type ObjQuestion = {
  id: string;
  question: string;
  options: [string, string, string, string];
  answerIndex: number;
  points: number;
};

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function blankQuestion(): ObjQuestion {
  return { id: newId('q'), question: '', options: ['', '', '', ''], answerIndex: 0, points: 10 };
}

type QuestWeek = { id: string; weekNumber: number; title: string };

export function QuestsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ weekNumber: 1, title: '', scripture: '', content: '' });
  const [questions, setQuestions] = useState<ObjQuestion[]>([blankQuestion()]);
  const [weeks, setWeeks] = useState<QuestWeek[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function load() {
    api<QuestWeek[]>('/api/teen-quest/weeks').then(setWeeks).catch((e: Error) => setError(e.message));
  }
  useEffect(() => {
    load();
    const weekParam = searchParams.get('week');
    if (weekParam) {
      const num = Number(weekParam);
      if (!Number.isNaN(num) && num > 0) {
        editWeek(num);
      }
    }
  }, [searchParams]);

  function asOptions(raw: unknown): [string, string, string, string] {
    const list = Array.isArray(raw) ? raw.map(String) : [];
    return [list[0] ?? '', list[1] ?? '', list[2] ?? '', list[3] ?? ''];
  }

  async function editWeek(weekNumber: number) {
    setMessage(''); setError('');
    try {
      const week = await api<{
        weekNumber: number; title: string; scripture: string; content: string;
        objectiveQuiz?: unknown; scrambleQuiz?: unknown;
      }>(`/api/teen-quest/weeks/${weekNumber}`);
      setForm({
        weekNumber: week.weekNumber,
        title: week.title,
        scripture: week.scripture,
        content: week.content,
      });
      const objs = Array.isArray(week.objectiveQuiz) ? week.objectiveQuiz : [];
      setQuestions(objs.length
        ? objs.map((q: Record<string, unknown>) => ({
            id: String(q.id || newId('q')),
            question: String(q.question || ''),
            options: asOptions(q.options),
            answerIndex: Number(q.answerIndex) || 0,
            points: Number(q.points) || 10,
          }))
        : [blankQuestion()]);
      setMessage(`Editing week ${weekNumber}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(''); setError('');
    const objectiveQuiz = questions
      .filter((q) => q.question.trim() && q.options.some((o) => o.trim()))
      .map((q) => ({ ...q, options: [...q.options] }));
    try {
      await api('/api/teen-quest/admin/weeks', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: Number(form.weekNumber),
          title: form.title,
          scripture: form.scripture,
          content: form.content,
          objectiveQuiz,
          scrambleQuiz: [],
        }),
      });
      setMessage(`Quest week ${form.weekNumber} saved`);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save quest');
    }
  }

  async function remove(id: string) {
    await api(`/api/teen-quest/admin/weeks/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        kicker="Publish"
        title="Quest"
        subtitle="Build the lesson and four-option quiz questions. Teachers open quizzes for class — they cannot author weeks."
        actions={
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-surface-2 text-xs font-semibold text-navy transition-colors cursor-pointer shadow-2xs"
            onClick={() => navigate('/app/dashboard/weeks')}
          >
            <span>Published weeks directory ({weeks.length}) →</span>
          </button>
        }
      />

      <form className="flex flex-col gap-6" onSubmit={submit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Lesson Details & Save Card */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Section 1: Lesson Details */}
            <section className="bg-surface border border-border rounded-card p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-border/60">
                <div>
                  <h3 className="text-base font-bold text-navy">Lesson details</h3>
                  <p className="text-xs text-muted mt-0.5">Schedule week number, title, scripture reading, and lesson reflection.</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-2 text-navy border border-border shrink-0">
                  Week {form.weekNumber}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-navy uppercase tracking-wide">Week number</span>
                  <input
                    className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                    type="number"
                    min={1}
                    value={form.weekNumber}
                    onChange={(e) => setForm({ ...form, weekNumber: Number(e.target.value) })}
                    required
                    aria-label="Week number"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-navy uppercase tracking-wide">Title</span>
                  <input
                    className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Title"
                    required
                  />
                </div>
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-navy uppercase tracking-wide">Scripture</span>
                  <input
                    className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                    value={form.scripture}
                    onChange={(e) => setForm({ ...form, scripture: e.target.value })}
                    placeholder="Scripture"
                    required
                  />
                </div>
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-navy uppercase tracking-wide">Lesson body</span>
                  <textarea
                    className="w-full rounded-xl border border-border bg-cream px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal font-sans leading-relaxed"
                    rows={6}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Lesson body"
                    required
                  />
                </div>
              </div>
            </section>

            {/* Save Action Card */}
            <div className="bg-surface border border-border rounded-card p-6 shadow-xs flex flex-col gap-3">
              <div>
                <div className="text-sm font-bold text-navy">Save & Publish</div>
                <p className="text-xs text-muted">
                  Week {form.weekNumber} · {questions.length} question{questions.length === 1 ? '' : 's'}
                </p>
              </div>
              {error ? <Alert kind="error">{error}</Alert> : null}
              {message ? <Alert kind="ok">{message}</Alert> : null}
              <button
                className="w-full rounded-xl bg-navy hover:bg-teal text-white py-3 px-4 font-semibold text-xs shadow-xs hover:shadow transition-all cursor-pointer"
                type="submit"
              >
                Save quest week
              </button>
            </div>
          </div>

          {/* Right Column: Objective Questions */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Section 2: Objective Quiz Builder */}
            <section className="bg-surface border border-border rounded-card p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-border/60">
                <div>
                  <h3 className="text-base font-bold text-navy">Objective question builder</h3>
                  <p className="text-xs text-muted mt-0.5">Four-option multiple-choice questions with server-graded points.</p>
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-2 text-xs font-semibold text-navy transition-colors cursor-pointer shrink-0"
                  onClick={() => setQuestions([...questions, blankQuestion()])}
                >
                  Add question
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {questions.map((q, qi) => (
                  <div className="p-4 rounded-xl border border-border bg-cream flex flex-col gap-3 shadow-xs" key={q.id}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-navy text-gold">
                        Question {qi + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs text-muted font-medium">
                          <span>Points</span>
                          <input
                            className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
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
                        </label>
                        {questions.length > 1 && (
                          <button
                            type="button"
                            className="px-2 py-1 rounded-md text-xs font-semibold text-error hover:bg-error-bg/60 border border-error/20 transition-colors cursor-pointer"
                            onClick={() => setQuestions(questions.filter((_, i) => i !== qi))}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold uppercase text-muted tracking-wide">Question prompt</span>
                      <input
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                        value={q.question}
                        onChange={(e) => {
                          const next = [...questions];
                          next[qi] = { ...q, question: e.target.value };
                          setQuestions(next);
                        }}
                        placeholder="Question"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt, oi) => {
                        const isCorrect = q.answerIndex === oi;
                        return (
                          <div
                            key={oi}
                            className={`flex flex-col gap-1.5 p-2.5 rounded-xl border transition-colors ${
                              isCorrect ? 'border-teal bg-teal-tint/30 ring-1 ring-teal/30' : 'border-border bg-surface'
                            }`}
                          >
                            <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer select-none">
                              <input
                                type="radio"
                                name={`answer-${q.id}`}
                                checked={isCorrect}
                                onChange={() => {
                                  const next = [...questions];
                                  next[qi] = { ...q, answerIndex: oi };
                                  setQuestions(next);
                                }}
                                className="accent-teal cursor-pointer"
                              />
                              <span className={isCorrect ? 'text-teal font-bold' : 'text-muted'}>
                                {isCorrect ? '✓ Correct' : `Option ${oi + 1}`}
                              </span>
                            </label>
                            <input
                              className="w-full rounded-lg border border-border/80 bg-white px-2.5 py-1.5 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
                              value={opt}
                              onChange={(e) => {
                                const options = [...q.options] as [string, string, string, string];
                                options[oi] = e.target.value;
                                const next = [...questions];
                                next[qi] = { ...q, options };
                                setQuestions(next);
                              }}
                              placeholder={`Option ${oi + 1}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </form>

      {/* Section 4: Published Weeks Directory */}
      {weeks.length > 0 && (
        <section className="bg-surface border border-border rounded-card p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-border/60">
            <div>
              <h3 className="text-base font-bold text-navy">Published weeks</h3>
              <p className="text-xs text-muted mt-0.5">{weeks.length} quest {weeks.length === 1 ? 'week' : 'weeks'} active in curriculum</p>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide w-20">Week</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide">Title</th>
                  <th className="py-2.5 px-3 font-semibold text-muted uppercase text-[10px] tracking-wide text-right w-36">Actions</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.id} className="border-b border-border/50 hover:bg-surface-2/30 transition-colors">
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-surface-2 text-navy border border-border">
                        W{w.weekNumber}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-navy"><strong>{w.title}</strong></td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg border border-border bg-surface hover:bg-surface-2 text-xs font-semibold text-navy transition-colors cursor-pointer"
                          onClick={() => editWeek(w.weekNumber)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg border border-error/20 bg-surface hover:bg-error-bg/60 text-xs font-semibold text-error transition-colors cursor-pointer"
                          onClick={() => remove(w.id)}
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
        </section>
      )}
    </div>
  );
}
