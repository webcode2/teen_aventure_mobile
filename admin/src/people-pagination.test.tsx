import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
it('marks new accounts using archived email addresses for admin review', async () => {
  vi.mocked(api).mockResolvedValue({ users: [{ ...user('New-registration'), registeredWithArchivedEmail: true }], children: [], families: [], pagination: { page: 1, pageSize: 40, total: 1, kind: 'users' } });
  render(<MemoryRouter><PeoplePage /></MemoryRouter>);
  expect(await screen.findByText('Archived email · review')).toBeTruthy();
  expect(screen.getByText('New-registration')).toBeTruthy();
});
it('offers only the two staff roles when inviting someone', async () => {
  vi.mocked(api).mockResolvedValue({ users: [], children: [], families: [], pagination: { page: 1, pageSize: 40, total: 0, kind: 'staff' } });
  render(<MemoryRouter><PeoplePage section="staff" /></MemoryRouter>);
  await userEvent.click(await screen.findByRole('button', { name: 'Invite staff' }));
  const dialog = screen.getByRole('dialog');
  const options = Array.from(dialog.querySelectorAll('select option')).map(option => option.textContent);
  expect(options).toEqual(['Super Editor', 'Editor']);
  expect(options).not.toContain('App Manager');
  expect(options).not.toContain('Super Admin');
  expect(dialog.querySelector('input[type="password"]')).toBeNull();
});

it.each([
  { tab: 'Children', title: 'Child details', kind: 'children', detail: {
    id: 'child-1', name: 'Test Explorer', ageBand: 'TEEN', independentLogin: true,
    family: { name: 'Test Household' }, askScore: 12, enrollments: [], scores: [], nudgesReceived: [],
  }, field: 'Current streak' },
  { tab: 'Families', title: 'Family details', kind: 'families', detail: {
    id: 'family-1', name: 'Test Household', owner: { name: 'Test Parent', email: 'parent@example.test' },
    _count: { children: 0 }, familyAskScore: 12, children: [], guardians: [], jarEntries: [], deletionRequests: [],
  }, field: 'Family AskScore' },
])('opens and closes the $tab detail drawer', async ({ tab, title, kind, detail, field }) => {
  vi.mocked(api).mockImplementation(async (path) => {
    if (path === `/api/admin/people/${kind}/${detail.id}`) return detail as never;
    const activeKind = new URL(path, 'http://localhost').searchParams.get('kind');
    return {
      users: [],
      children: activeKind === 'children' ? [detail] : [],
      families: activeKind === 'families' ? [detail] : [],
      pagination: { page: 1, pageSize: 40, total: activeKind === kind ? 1 : 0, kind: activeKind },
    } as never;
  });

  render(<MemoryRouter><PeoplePage /></MemoryRouter>);
  await userEvent.click(await screen.findByRole('tab', { name: new RegExp(`^${tab}`) }));
  await userEvent.click(await screen.findByRole('button', { name: detail.name }));
  const drawer = within(await screen.findByRole('dialog', { name: title }));
  expect(await drawer.findByText(field)).toBeTruthy();
  await userEvent.click(drawer.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog', { name: title })).toBeNull();
  expect(screen.getByRole('button', { name: detail.name })).toBeTruthy();
});
