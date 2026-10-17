import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

describe('Puzzle Studio WIP conflict dialog', () => {
  it('shows reload theirs / keep mine when autosave returns 409', async () => {
    setToken('test-token', { role: 'APP_MANAGER', email: 'ed@askhub.local' });
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
