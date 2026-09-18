import { useEffect, useState } from 'react';
import { api } from './api';
import { Alert, Field, PageHeader } from './ui';

type ObjQuestion = {
  id: string;
  question: string;
  options: [string, string, string, string];
  answerIndex: number;
  points: number;
};

type ScrambleItem = {
  id: string;
  hint: string;
  scrambledWord: string;
  targetWord: string;
  points: number;
};

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function scrambleWord(word: string): string {
  const letters = word.replace(/[^A-Za-z]/g, '').toUpperCase().split('');
  if (letters.length < 2) return letters.join('');
  const original = letters.join('');
  const out = letters.slice();
  for (let attempt = 0; attempt < 16; attempt++) {
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    if (out.join('') !== original) return out.join('');
  }
  return out.join('');
}

function blankQuestion(): ObjQuestion {
  return { id: newId('q'), question: '', options: ['', '', '', ''], answerIndex: 0, points: 10 };
}

function blankScramble(): ScrambleItem {
  return { id: newId('s'), hint: '', scrambledWord: '', targetWord: '', points: 10 };
}

type QuestWeek = { id: string; weekNumber: number; title: string };

export function QuestsPage() {
  const [form, setForm] = useState({ weekNumber: 1, title: '', scripture: '', content: '' });
  const [questions, setQuestions] = useState<ObjQuestion[]>([blankQuestion()]);
  const [scrambles, setScrambles] = useState<ScrambleItem[]>([blankScramble()]);
  const [weeks, setWeeks] = useState<QuestWeek[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function load() {
    api<QuestWeek[]>('/api/teen-quest/weeks').then(setWeeks).catch((e: Error) => setError(e.message));
  }
  useEffect(() => { load(); }, []);

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
      const scr = Array.isArray(week.scrambleQuiz) ? week.scrambleQuiz : [];
      setQuestions(objs.length
        ? objs.map((q: Record<string, unknown>) => ({
            id: String(q.id || newId('q')),
            question: String(q.question || ''),
            options: asOptions(q.options),
            answerIndex: Number(q.answerIndex) || 0,
            points: Number(q.points) || 10,
          }))
        : [blankQuestion()]);
      setScrambles(scr.length
        ? scr.map((s: Record<string, unknown>) => ({
            id: String(s.id || newId('s')),
            hint: String(s.hint || ''),
            scrambledWord: String(s.scrambledWord || ''),
            targetWord: String(s.targetWord || ''),
            points: Number(s.points) || 10,
          }))
        : [blankScramble()]);
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
    const scrambleQuiz = scrambles
      .filter((s) => s.targetWord.trim())
      .map((s) => ({
        ...s,
        targetWord: s.targetWord.trim().toUpperCase(),
        scrambledWord: (s.scrambledWord.trim() || scrambleWord(s.targetWord)).toUpperCase(),
        hint: s.hint.trim(),
      }));
    try {
      await api('/api/teen-quest/admin/weeks', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: Number(form.weekNumber),
          title: form.title,
          scripture: form.scripture,
          content: form.content,
          objectiveQuiz,
          scrambleQuiz,
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
    <>
      <PageHeader
        kicker="Teen Quest"
        title="Weekly quests"
        subtitle="Build the lesson, four-option questions, and scramble words. Teachers open quizzes for class — they cannot author weeks."
      />
      <form className="card" onSubmit={submit}>
        <h3>Teen Quest weeks (App Manager only — teachers cannot author)</h3>
        <p className="muted">Build the lesson, four-option questions, and scramble words. Teachers open quizzes for class — they cannot author weeks.</p>
        <Field label="Week number">
          <input type="number" min={1} value={form.weekNumber} onChange={(e) => setForm({ ...form, weekNumber: Number(e.target.value) })} required aria-label="Week number" />
        </Field>
        <Field label="Title">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" required />
        </Field>
        <Field label="Scripture">
          <input value={form.scripture} onChange={(e) => setForm({ ...form, scripture: e.target.value })} placeholder="Scripture" required />
        </Field>
        <Field label="Lesson body">
          <textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Lesson body" required />
        </Field>

        <h3>Objective question builder</h3>
        {questions.map((q, qi) => (
          <div className="builder-block" key={q.id}>
            <div className="builder-head">
              <span>Question {qi + 1}</span>
              <button type="button" className="btn secondary" onClick={() => setQuestions(questions.filter((_, i) => i !== qi))}>Remove</button>
            </div>
            <Field label="Question">
              <input value={q.question} onChange={(e) => {
                const next = [...questions];
                next[qi] = { ...q, question: e.target.value };
                setQuestions(next);
              }} placeholder="Question" />
            </Field>
            <div className="option-grid">
              {q.options.map((opt, oi) => (
                <label key={oi} className="muted">
                  <span>
                    <input
                      type="radio"
                      name={`answer-${q.id}`}
                      checked={q.answerIndex === oi}
                      onChange={() => {
                        const next = [...questions];
                        next[qi] = { ...q, answerIndex: oi };
                        setQuestions(next);
                      }}
                    /> Correct
                  </span>
                  <input
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
                </label>
              ))}
            </div>
            <Field label="Points">
              <input type="number" min={1} value={q.points} onChange={(e) => {
                const next = [...questions];
                next[qi] = { ...q, points: Number(e.target.value) };
                setQuestions(next);
              }} aria-label={`Points for question ${qi + 1}`} />
            </Field>
          </div>
        ))}
        <div className="inline-actions">
          <button type="button" className="btn secondary" onClick={() => setQuestions([...questions, blankQuestion()])}>Add question</button>
        </div>

        <h3>Cross scramble builder</h3>
        {scrambles.map((s, si) => (
          <div className="builder-block" key={s.id}>
            <div className="builder-head">
              <span>Scramble {si + 1}</span>
              <button type="button" className="btn secondary" onClick={() => setScrambles(scrambles.filter((_, i) => i !== si))}>Remove</button>
            </div>
            <Field label="Target word">
              <input value={s.targetWord} onChange={(e) => {
                const next = [...scrambles];
                next[si] = { ...s, targetWord: e.target.value };
                setScrambles(next);
              }} placeholder="Target word" />
            </Field>
            <Field label="Clue / hint">
              <input value={s.hint} onChange={(e) => {
                const next = [...scrambles];
                next[si] = { ...s, hint: e.target.value };
                setScrambles(next);
              }} placeholder="Clue / hint" />
            </Field>
            <Field label="Scrambled letters">
              <input value={s.scrambledWord} onChange={(e) => {
                const next = [...scrambles];
                next[si] = { ...s, scrambledWord: e.target.value };
                setScrambles(next);
              }} placeholder="Scrambled letters" aria-label={`Scrambled letters ${si + 1}`} />
            </Field>
            <div className="inline-actions">
              <button type="button" className="btn secondary" onClick={() => {
                const next = [...scrambles];
                next[si] = { ...s, scrambledWord: scrambleWord(s.targetWord || s.scrambledWord) };
                setScrambles(next);
              }}>Auto-scramble</button>
            </div>
            <Field label="Points">
              <input type="number" min={1} value={s.points} onChange={(e) => {
                const next = [...scrambles];
                next[si] = { ...s, points: Number(e.target.value) };
                setScrambles(next);
              }} aria-label={`Points for scramble ${si + 1}`} />
            </Field>
          </div>
        ))}
        <div className="inline-actions">
          <button type="button" className="btn secondary" onClick={() => setScrambles([...scrambles, blankScramble()])}>Add scramble</button>
        </div>

        {error ? <Alert kind="error">{error}</Alert> : null}
        {message ? <Alert kind="ok">{message}</Alert> : null}
        <button className="btn">Save quest week</button>
        {weeks.length > 0 && (
          <table>
            <thead><tr><th>Week</th><th>Title</th><th></th></tr></thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.id}>
                  <td>{w.weekNumber}</td>
                  <td>{w.title}</td>
                  <td>
                    <button type="button" className="btn secondary" onClick={() => editWeek(w.weekNumber)}>Edit</button>
                    {' '}
                    <button type="button" className="btn secondary" onClick={() => remove(w.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </form>
    </>
  );
}
