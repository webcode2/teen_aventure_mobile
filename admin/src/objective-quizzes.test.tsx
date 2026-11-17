import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { PromptHost } from './prompt-dialog';
import { api } from './api';
import { ObjectiveQuizzesPage, QuestQuizPicker } from './pages-objective-quizzes';

vi.mock('./api', () => ({ api: vi.fn() }));
const mockApi = vi.mocked(api);
const path = '/api/teen-quest/admin/quizzes';
const question = { id: 'q-1', type: 'FILL_BLANK', question: 'Who built the ark?', acceptedAnswers: ['Noah'], points: 10 };

afterEach(() => { cleanup(); mockApi.mockReset(); });

it('creates a standalone quiz without any quest details', async () => {
  mockApi.mockImplementation(async (_url, options) => {
    if (options?.method === 'POST') return { id: 'quiz-1', ...JSON.parse(options.body as string) };
    return [];
  });
  render(<ObjectiveQuizzesPage />);
  await userEvent.click(screen.getByRole('button', { name: 'Create quiz' }));
  await userEvent.type(screen.getByLabelText('Quiz title'), 'Genesis quiz');
  await userEvent.click(screen.getByRole('button', { name: 'Create a fill-in-the-blank question' }));
  await userEvent.type(screen.getByLabelText('Question 1'), question.question);
  await userEvent.type(screen.getByLabelText('Accepted answer 1 for question 1'), 'Noah');
  await userEvent.click(screen.getByRole('button', { name: 'Save quiz' }));
  expect(await screen.findByText('Quiz saved.')).toBeTruthy();
  const post = mockApi.mock.calls.find(([url, options]) => url === path && options?.method === 'POST');
  const payload = JSON.parse(post?.[1]?.body as string);
  expect(payload).toEqual({ title: 'Genesis quiz', questions: [expect.objectContaining({
    type: 'FILL_BLANK', question: question.question, acceptedAnswers: ['Noah'],
  })] });
});

it('copies the selected library quiz into the quest editor', async () => {
  mockApi.mockImplementation(async (url) => url === path
    ? [{ id: 'quiz-1', title: 'Genesis quiz', questionCount: 1 }]
    : { id: 'quiz-1', title: 'Genesis quiz', questions: [question] });
  const onPick = vi.fn();
  render(<QuestQuizPicker hasQuestions={false} onPick={onPick} />);
  await screen.findByRole('option', { name: 'Genesis quiz' });
  await userEvent.selectOptions(screen.getByLabelText('Quiz library'), 'quiz-1');
  await userEvent.click(screen.getByRole('button', { name: 'Use quiz' }));
  expect(await screen.findByText(/Copied Genesis quiz/)).toBeTruthy();
  expect(onPick).toHaveBeenCalledWith([expect.objectContaining(question)], 'quiz-1');
});


it('lists attached quests and updates the library after assigning or detaching', async () => {
  const quest = { id: 'quest-1', title: 'The flood', weekNumber: 3 };
  mockApi.mockImplementation(async (url, options) => {
    if (options?.method === 'PUT') return {};
    if (url.endsWith('/quiz-quests')) return [{ ...quest, objectiveQuizId: null }];
    return [{ id: 'quiz-1', title: 'Genesis quiz', questionCount: 1, quests: [quest] }];
  });

  render(<MemoryRouter><ObjectiveQuizzesPage /><PromptHost /></MemoryRouter>);
  expect(await screen.findByRole('link', { name: 'Week 3 · The flood' })).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Detach from Week 3' }));
  const confirm = await screen.findByRole('dialog', { name: 'Detach quiz' });
  await userEvent.click(within(confirm).getByRole('button', { name: 'Detach quiz' }));
  expect(await screen.findByText('Quiz detached from Week 3.')).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Week 3 · The flood' })).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: 'Assign Genesis quiz to a quest' }));
  await userEvent.selectOptions(await screen.findByLabelText('Quest'), 'quest-1');
  await userEvent.click(screen.getByRole('button', { name: 'Assign quiz' }));
  expect(await screen.findByRole('link', { name: 'Week 3 · The flood' })).toBeTruthy();
  const putBodies = mockApi.mock.calls.filter(([, options]) => options?.method === 'PUT')
    .map(([, options]) => JSON.parse(options?.body as string));
  expect(putBodies).toEqual([
    { quizId: null, expectedQuizId: 'quiz-1' },
    { quizId: 'quiz-1', expectedQuizId: null },
  ]);
});
