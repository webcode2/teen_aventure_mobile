import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { api } from './api';
import { MatchingLibraryPage } from './pages-matching-library';
import { PuzzleLibraryPage } from './pages-puzzle-library';
import { ObjectiveQuizzesPage } from './pages-objective-quizzes';
import { QuestsPage } from './pages-quest-list';

vi.mock('./api', () => ({ api: vi.fn() }));
afterEach(cleanup);

it.each([
  { kind: 'puzzle', Page: PuzzleLibraryPage },
  { kind: 'matching', Page: MatchingLibraryPage },
])('shows one published row per $kind game', async ({ kind, Page }) => {
  const updatedAt = '2026-11-20T07:00:00Z';
  const game = {
    [`${kind}Id`]: 'timed-game',
    [`${kind}Key`]: 'testing-time',
    title: 'Testing Time',
    updatedAt,
  };
  const versions = [
    { ...game, id: 'old', version: 36, status: 'STAGED' },
    { ...game, id: 'current', version: 37, status: 'LIVE' },
    { ...game, [`${kind}Id`]: 'new-game', [`${kind}Key`]: 'new-game',
      id: 'new-version', title: 'Awaiting promotion', version: 1, status: 'STAGED' },
  ];
  vi.mocked(api).mockImplementation(async (path) => path === '/api/puzzle-drafts'
    ? [{ id: 'saved-edit', puzzleKey: 'testing-time', title: 'Testing Time', version: 2, updatedAt }]
    : { versions });

  render(<MemoryRouter><Page /></MemoryRouter>);
  expect(await screen.findByText('Testing Time')).toBeTruthy();
  expect(screen.getByText(/\bv37\b/)).toBeTruthy();
  expect(screen.queryByText(/\bv36\b/)).toBeNull();
  expect(screen.getByText('Awaiting promotion')).toBeTruthy();

  if (kind === 'puzzle') {
    await userEvent.click(screen.getByRole('tab', { name: /Drafts/ }));
    expect(screen.getByText('Testing Time')).toBeTruthy();
    expect(screen.queryByText(/\bv37\b/)).toBeNull();
  }
});

it.each([
  { name: 'quiz', path: '/api/teen-quest/admin/quizzes', Page: ObjectiveQuizzesPage },
  { name: 'quest', path: '/api/teen-quest/weeks', Page: QuestsPage },
  { name: 'matching', path: '/api/matchings', Page: MatchingLibraryPage },
  { name: 'puzzle', path: '/api/puzzles', Page: PuzzleLibraryPage },
])('paginates the $name library at 20 items', async ({ name, path, Page }) => {
  const entries = Array.from({ length: 21 }, (_, index) => ({
    id: `entry-${index + 1}`,
    title: `Library entry ${index + 1}`,
    weekNumber: index + 1,
    questionCount: 1,
    [`${name}Id`]: `game-${index + 1}`,
    [`${name}Key`]: `game-${index + 1}`,
    version: 1,
    status: 'LIVE',
    updatedAt: '2026-11-20T07:00:00Z',
  }));
  vi.mocked(api).mockImplementation(async (url) => {
    if (url !== path) return url === '/api/puzzle-drafts' ? [] : { versions: [] };
    return name === 'quiz' || name === 'quest' ? entries : { versions: entries };
  });

  render(<MemoryRouter><Page /></MemoryRouter>);
  expect(await screen.findAllByText(/^Library entry \d+$/)).toHaveLength(20);
  await userEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(screen.getAllByText(/^Library entry \d+$/)).toHaveLength(1);
  expect(screen.getByText(/^(Showing )?21–21 of 21$/)).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: /^(Prev|Previous)$/ }));
  expect(screen.getAllByText(/^Library entry \d+$/)).toHaveLength(20);
});
