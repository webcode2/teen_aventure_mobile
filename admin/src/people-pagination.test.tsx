import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { api } from './api';
import { PeoplePage } from './pages-people';
vi.mock('./api', () => ({ api: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const user = (id: string) => ({ id, name: id, email: `${id}@example.test`, platformRole: 'MAIN_ACCOUNT', isActive: true, appLogin: true, createdAt: '2026-01-01', churchRoles: [], guardianships: [], familiesOwned: [] });
it('requests the next server page without slicing away its rows', async () => {
  vi.mocked(api).mockImplementation(async path => {
    const query = new URL(path, 'http://localhost').searchParams;
    const page = Number(query.get('page') ?? 1);
    return { users: [user(`Account-page-${page}`)], children: [], families: [], pagination: { page, pageSize: 40, total: 85, kind: 'users' } } as any;
  });
  render(<MemoryRouter><PeoplePage /></MemoryRouter>);
  await screen.findByText('Account-page-1');
  await userEvent.click(screen.getByRole('button', { name: /next/i }));
  expect(await screen.findByText('Account-page-2')).toBeTruthy();
  expect(vi.mocked(api).mock.calls.some(call => call[0].includes('page=2') && call[0].includes('pageSize=40'))).toBe(true);
});
it('searches globally on the API and switches entity tabs without fetching entire directories', async () => {
  vi.mocked(api).mockImplementation(async path => {
    const query = new URL(path, 'http://localhost').searchParams;
    const kind = query.get('kind') ?? 'users';
    return { users: kind === 'users' ? [user(query.get('search') ? 'Found-on-server' : 'Initial')] : [], children: [], families: [], pagination: { page: 1, pageSize: 40, total: kind === 'users' ? 1 : 0, kind } } as any;
  });
  render(<MemoryRouter><PeoplePage /></MemoryRouter>);
  await screen.findByText('Initial');
  await userEvent.type(screen.getByRole('textbox', { name: 'Search directory' }), 'far away');
  await screen.findByText('Found-on-server');
  await userEvent.click(screen.getByRole('tab', { name: /^Children/ }));
  await waitFor(() => expect(vi.mocked(api).mock.calls.some(call => call[0].includes('kind=children'))).toBe(true));
});
