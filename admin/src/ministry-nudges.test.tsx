import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, clearPastorSession, setPastorSession } from './api';
import { PastorPortalPage } from './pages-pastor';
vi.mock('./api', async () => ({ ...await vi.importActual<typeof import('./api')>('./api'), api: vi.fn() }));
afterEach(() => { cleanup(); clearPastorSession(); vi.clearAllMocks(); });
async function open(count: number) {
  setPastorSession('test-token', { id: 'leader', name: 'Leader', email: 'leader@example.test', role: 'MAIN_ACCOUNT', churchRole: 'PASTOR', churchId: 'church-a' });
  vi.mocked(api).mockImplementation(async path => {
    if (path === '/api/churches/church-a') return { id: 'church-a', name: 'Test Ministry', joinCode: 'TEST' } as any;
    if (path.endsWith('/nudge-templates')) return [
      { id: 'system', message: 'Praying for you today', churchId: null, status: 'APPROVED', active: true },
      ...Array.from({ length: count }, (_, index) => ({ id: `custom-${index}`, message: `Ministry message ${index}`, churchId: 'church-a', status: index === 0 ? 'REJECTED' : 'PENDING', active: false })),
    ] as any;
    return [] as any;
  });
  render(<MemoryRouter><PastorPortalPage churchIdFromRoute="church-a" sectionFromRoute="nudges" /></MemoryRouter>);
  await screen.findByRole('tab', { name: 'New' });
}
describe('ministry nudge library', () => {
  it('shows system nudges without counting them against custom submissions', async () => {
    await open(29);
    expect(screen.getByText('29 / 30 custom messages')).toBeTruthy();
    await userEvent.type(screen.getByPlaceholderText('e.g. Keep your daily streak going'), 'A new cheer');
    expect((screen.getByRole('button', { name: 'Submit for review' }) as HTMLButtonElement).disabled).toBe(false);
    await userEvent.click(screen.getByRole('tab', { name: 'System' }));
    expect(screen.getByText('Praying for you today')).toBeTruthy();
    expect(screen.queryByText('Ministry message 0')).toBeNull();
  });
  it('blocks new submissions at 30 while retaining system nudges and resubmission', async () => {
    await open(30);
    expect(screen.getByText('30 / 30 custom messages')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Submit for review' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByPlaceholderText('e.g. Keep your daily streak going') as HTMLTextAreaElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole('tab', { name: 'Custom' }));
    expect(screen.getByRole('button', { name: 'Edit & resubmit' })).toBeTruthy();
    expect(screen.queryByText('Praying for you today')).toBeNull();
    await userEvent.click(screen.getByRole('tab', { name: 'System' }));
    expect(screen.getByText('System nudge · Available to all ministries')).toBeTruthy();
    expect(screen.getByText('Praying for you today')).toBeTruthy();
  });
});
