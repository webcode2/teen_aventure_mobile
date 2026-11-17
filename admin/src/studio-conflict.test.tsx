import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { PuzzlesStudioPage } from './pages-puzzles';
import { api, ApiError, setToken } from './api';

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return {
    ...actual,
    api: vi.fn(),
  };
});

const mockedApi = vi.mocked(api);

afterEach(() => { cleanup(); mockedApi.mockReset(); });

it('resumes the saved draft and saves edits against its original ID', async () => {
  const doc = {
    schemaVersion: 1, id: 'saved-key', type: 'LAYOUT', title: 'Saved crossword',
    scripture: '', rewards: {}, data: { steps: [] },
  };
  mockedApi.mockImplementation(async (path, options) => {
    if (options?.method === 'PUT') return { id: 'draft-1', version: 5 };
    if (path === '/api/puzzle-drafts/draft-1') return { id: 'draft-1', version: 4, doc };
    return [{ id: 'draft-1', title: doc.title, version: 4, puzzleKey: doc.id }];
  });
  render(<MemoryRouter><PuzzlesStudioPage /></MemoryRouter>);
  const title = await screen.findByDisplayValue('Saved crossword');
  expect(mockedApi.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(false);
  await userEvent.type(title, ' revised');
  await userEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() => {
    const saved = mockedApi.mock.calls.find(([, options]) => options?.method === 'PUT');
    expect(saved).toBeTruthy();
    expect(JSON.parse(saved?.[1]?.body as string)).toMatchObject({ id: 'draft-1', title: 'Saved crossword revised' });
  });
});

describe('Puzzle Studio WIP conflict dialog', () => {
  it('shows reload theirs / keep mine when autosave returns 409', async () => {
    setToken('test-token', { role: 'SUPER_ADMIN', email: 'ed@askhub.local' });
    mockedApi.mockImplementation(async (path: string, options?: RequestInit) => {
      if (path === '/api/puzzle-drafts' && (!options || options.method === undefined || options.method === 'GET')) {
        return [];
      }
      if (path === '/api/puzzles') {
        return { versions: [] };
      }
      if (path === '/api/puzzle-drafts' && options?.method === 'PUT') {
        throw new ApiError(409, 'Stale draft version', {
          statusCode: 409,
          error: 'Conflict',
          message: 'Stale draft version',
          serverVersion: 12,
          doc: {
            schemaVersion: 1,
            id: 'theirs',
            type: 'CHAIN',
            title: 'Week 3',
            scripture: 'Judges 4',
            rewards: {},
            data: { steps: [] },
          },
        });
      }
      return [];
    });

    render(
      <MemoryRouter>
        <PuzzlesStudioPage />
      </MemoryRouter>,
    );
    const title = screen.getByRole('textbox', { name: 'Puzzle title' });
    await waitFor(() => expect((title as HTMLInputElement).disabled).toBe(false));
    await userEvent.clear(title);
    await userEvent.type(title, 'Conflict test');

    await waitFor(
      () => {
        expect(screen.getByRole('alertdialog', { name: /version conflict/i })).toBeTruthy();
      },
      { timeout: 3000 },
    );
    expect(screen.getByRole('button', { name: 'Reload theirs' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Keep mine' })).toBeTruthy();
  });
});
