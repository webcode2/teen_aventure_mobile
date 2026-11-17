import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api } from './api';
import { askConfirm } from './prompt-dialog';
import { Alert, Button, Spinner } from './ui';
import { ObjectiveQuizQuestions, normalizeQuestion, serializeQuizQuestions, type ObjQuestion } from './objective-quiz-questions';

const quizPath = '/api/teen-quest/admin/quizzes';
const questPath = '/api/teen-quest/admin/quiz-quests';

type QuestLink = { id: string; title: string; weekNumber: number };
type QuestOption = QuestLink & { objectiveQuizId: string | null };
type QuizEntry = { id: string; title: string; questionCount: number; quests?: QuestLink[] };
type QuizDocument = { id: string; title: string; questions: ObjQuestion[] };

function useQuizLibrary() {
  const [quizzes, setQuizzes] = useState<QuizEntry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api<QuizEntry[]>(quizPath)
      .then((items) => { if (active) setQuizzes(items); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load quizzes'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return { quizzes, setQuizzes, error, loading };
}

export function ObjectiveQuizzesPage() {
  const { quizzes, setQuizzes, error: libraryError, loading } = useQuizLibrary();
  const [editor, setEditor] = useState<QuizDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [assigningQuiz, setAssigningQuiz] = useState<QuizEntry | null>(null);
  const [quests, setQuests] = useState<QuestOption[]>([]);
  const [questId, setQuestId] = useState('');

  async function openAssignment(quiz: QuizEntry) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setQuests(await api<QuestOption[]>(questPath));
      setQuestId('');
      setAssigningQuiz(quiz);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Could not load quests');
    } finally {
      setBusy(false);
    }
  }

  async function changeAssignment(quest: QuestOption, quiz: QuizEntry | null) {
    if (busy) return;
    if (!quiz && !await askConfirm(`Remove the quiz from Week ${quest.weekNumber}?`, {
      title: 'Detach quiz', confirmLabel: 'Detach quiz', tone: 'danger',
    })) return;
    if (quiz && quest.objectiveQuizId && !await askConfirm(`Replace the quiz in Week ${quest.weekNumber} with “${quiz.title}”?`, {
      title: 'Replace quest quiz', confirmLabel: 'Assign quiz',
    })) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      await api(`${questPath}/${quest.id}`, {
        method: 'PUT',
        body: JSON.stringify({ quizId: quiz?.id ?? null, expectedQuizId: quest.objectiveQuizId }),
      });
      const link = { id: quest.id, title: quest.title, weekNumber: quest.weekNumber };
      setQuizzes((items) => items.map((item) => {
        const remaining = (item.quests ?? []).filter((entry) => entry.id !== quest.id);
        return { ...item, quests: item.id === quiz?.id
          ? [...remaining, link].sort((first, second) => first.weekNumber - second.weekNumber) : remaining };
      }));
      setAssigningQuiz(null);
      setMessage(quiz ? `Quiz assigned to Week ${quest.weekNumber}.` : `Quiz detached from Week ${quest.weekNumber}.`);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Could not update quiz assignment');
    } finally {
      setBusy(false);
    }
  }

  async function openQuiz(id?: string) {
    setError('');
    setMessage('');
    if (!id) {
      setEditor({ id: '', title: '', questions: [] });
      return;
    }
    setBusy(true);
    try {
      const quiz = await api<QuizDocument>(`${quizPath}/${id}`);
      setEditor({ ...quiz, questions: quiz.questions.map(normalizeQuestion) });
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Could not open quiz');
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editor || busy) return;
    setError('');
    setMessage('');
    const questions = serializeQuizQuestions(editor.questions);
    if (!questions.length || questions.length !== editor.questions.length) {
      setError('Complete each question and answer before saving.');
      return;
    }
    setBusy(true);
    try {
      const saved = await api<QuizDocument>(editor.id ? `${quizPath}/${editor.id}` : quizPath, {
        method: editor.id ? 'PUT' : 'POST',
        body: JSON.stringify({ title: editor.title.trim(), questions }),
      });
      setEditor({ ...saved, questions: saved.questions.map(normalizeQuestion) });
      setQuizzes((items) => [{ id: saved.id, title: saved.title, questionCount: saved.questions.length, quests: items.find((item) => item.id === saved.id)?.quests }, ...items.filter((item) => item.id !== saved.id)]);
      setMessage('Quiz saved.');
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Could not save quiz');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-navy">Quiz library</h1>
        {editor
          ? <Button variant="outline" disabled={busy} onClick={() => { setEditor(null); setError(''); setMessage(''); }}>Back to library</Button>
          : <Button disabled={busy || Boolean(assigningQuiz)} onClick={() => void openQuiz()}>Create quiz</Button>}
      </div>
      {error || libraryError ? <Alert kind="error">{error || libraryError}</Alert> : null}
      {message ? <p role="status" className="text-sm text-teal">{message}</p> : null}
      {assigningQuiz ? (
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-bold text-navy">Assign {assigningQuiz.title}</h2>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-semibold text-navy">
              Quest
              <select value={questId} disabled={busy} onChange={(event) => setQuestId(event.target.value)}
                className="rounded-lg border border-border bg-cream px-3 py-2 text-sm">
                <option value="">{quests.length ? 'Choose a quest' : 'No quests available'}</option>
                {quests.map((quest) => <option key={quest.id} value={quest.id} disabled={quest.objectiveQuizId === assigningQuiz.id}>
                  Week {quest.weekNumber} · {quest.title}{quest.objectiveQuizId ? ' · Has quiz' : ''}
                </option>)}
              </select>
            </label>
            <Button size="sm" disabled={!questId || busy} onClick={() => {
              const quest = quests.find((item) => item.id === questId);
              if (quest) void changeAssignment(quest, assigningQuiz);
            }}>Assign quiz</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setAssigningQuiz(null)}>Cancel</Button>
          </div>
        </section>
      ) : null}
      {editor ? (
        <form className="flex flex-col gap-5" onSubmit={save}>
          <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5">
            <label className="flex flex-col gap-1 text-sm font-semibold text-navy">
              Quiz title
              <input required maxLength={200} value={editor.title} onChange={(event) => setEditor({ ...editor, title: event.target.value })}
                className="rounded-lg border border-border bg-cream px-3 py-2" />
            </label>
            <ObjectiveQuizQuestions questions={editor.questions} setQuestions={(questions) => setEditor({ ...editor, questions })} />
            <Button type="submit" className="self-start">{busy ? 'Saving…' : 'Save quiz'}</Button>
          </fieldset>
        </form>
      ) : loading ? <Spinner /> : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {quizzes.length ? quizzes.map((quiz) => (
            <li key={quiz.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" disabled={busy || Boolean(assigningQuiz)} onClick={() => void openQuiz(quiz.id)}
                  className="text-left text-sm font-semibold text-navy hover:underline">
                  {quiz.title}
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">{quiz.questionCount} questions</span>
                  <Button size="sm" variant="outline" disabled={busy || Boolean(assigningQuiz)}
                    aria-label={`Assign ${quiz.title} to a quest`} onClick={() => void openAssignment(quiz)}>Assign to quest</Button>
                </div>
              </div>
              {quiz.quests?.length ? (
                <ul className="flex flex-wrap gap-2">
                  {quiz.quests.map((quest) => (
                    <li key={quest.id} className="flex items-center gap-2 rounded-lg border border-border bg-cream px-2 py-1 text-xs">
                      <Link to={`/app/dashboard/quests/${quest.weekNumber}?step=quiz`} className="font-semibold text-teal hover:underline">
                        Week {quest.weekNumber} · {quest.title}
                      </Link>
                      <button type="button" disabled={busy || Boolean(assigningQuiz)} aria-label={`Detach from Week ${quest.weekNumber}`}
                        className="text-muted hover:text-error disabled:opacity-50"
                        onClick={() => void changeAssignment({ ...quest, objectiveQuizId: quiz.id }, null)}>Detach</button>
                    </li>
                  ))}
                </ul>
              ) : <span className="text-xs text-muted">Unassigned</span>}
            </li>
          )) : <li className="p-4 text-sm text-muted">No saved quizzes yet.</li>}
        </ul>
      )}
    </div>
  );
}

export function QuestQuizPicker({ onPick, hasQuestions }: {
  onPick: (questions: ObjQuestion[], id: string) => void;
  hasQuestions: boolean;
}) {
  const { quizzes, error: libraryError, loading } = useQuizLibrary();
  const [id, setId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [attached, setAttached] = useState('');

  async function attach() {
    if (!id) return;
    if (hasQuestions && !await askConfirm('Replace the questions in this quest with a copy of the selected quiz?', { title: 'Replace quest quiz', confirmLabel: 'Use quiz' })) return;
    setBusy(true);
    setError('');
    try {
      const quiz = await api<QuizDocument>(`${quizPath}/${id}`);
      onPick(quiz.questions.map(normalizeQuestion), quiz.id);
      setAttached(quiz.title);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'Could not load the selected quiz');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-semibold text-navy">
          Quiz library
          <select value={id} disabled={loading || busy} onChange={(event) => setId(event.target.value)} className="rounded-lg border border-border bg-cream px-3 py-2 text-sm">
            <option value="">{loading ? 'Loading quizzes…' : quizzes.length ? 'Choose a saved quiz' : 'No saved quizzes'}</option>
            {quizzes.map((quiz) => <option key={quiz.id} value={quiz.id}>{quiz.title}</option>)}
          </select>
        </label>
        <Button size="sm" variant="outline" disabled={!id || busy} onClick={() => void attach()}>Use quiz</Button>
      </div>
      {attached ? <p role="status" className="mt-2 text-xs text-teal">Copied {attached}. Save the quest to apply it.</p> : null}
      {error || libraryError ? <div className="mt-2"><Alert kind="error">{error || libraryError}</Alert></div> : null}
    </div>
  );
}
