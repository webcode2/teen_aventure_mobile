import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import { AccountDeletionPage } from './pages-account-deletion';
vi.mock('./public-shell', () => ({ PublicLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('./api', () => ({ API_BASE: '', clearPastorSession: vi.fn(), setApplicantToken: vi.fn() }));
const fetcher = vi.fn();
beforeEach(() => { vi.stubGlobal('fetch', fetcher); fetcher.mockReset(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function fill() {
  fireEvent.change(screen.getByLabelText('Account email'), { target: { value: 'owner@example.org' } });
  fireEvent.change(screen.getByLabelText('Confirm your password'), { target: { value: 'test-password' } });
}
it('requires confirmation and posts credentials only in the body of a lifecycle request', async () => {
  fetcher.mockResolvedValue({ ok: true, json: async () => ({ stage: 'recoverable', recoverableUntil: '2026-11-17T12:00:00Z', purgeAfter: '2027-01-16T12:00:00Z' }) });
  render(<MemoryRouter><AccountDeletionPage /></MemoryRouter>); fill();
  expect((screen.getByRole('button', { name: 'Verify password & request deletion' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Verify password & request deletion' }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  expect(fetcher.mock.calls[0][0]).toBe('/api/accounts/request-deletion');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ email: 'owner@example.org', password: 'test-password', confirmation: 'REQUEST DELETION' });
  expect(await screen.findByText('Stage: recoverable')).toBeTruthy();
  expect((screen.getByLabelText('Confirm your password') as HTMLInputElement).value).toBe('');
});
it('can check and restore a pending deletion without a normal app session', async () => {
  fetcher.mockResolvedValueOnce({ ok: true, json: async () => ({ stage: 'recoverable' }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ restored: true }) });
  render(<MemoryRouter><AccountDeletionPage /></MemoryRouter>); fill();
  fireEvent.click(screen.getByRole('button', { name: 'Check deletion status' }));
  await screen.findByText('Stage: recoverable');
  fireEvent.change(screen.getByLabelText('Confirm your password'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify password & restore account' }));
  expect(await screen.findByText('Your account and linked resources have been restored. You can sign in again.')).toBeTruthy();
  expect(fetcher.mock.calls[1][0]).toBe('/api/accounts/restore-deletion');
});
it('does not offer restoration for backend-only records', async () => {
  fetcher.mockResolvedValue({ ok: true, json: async () => ({ stage: 'backend_only' }) });
  render(<MemoryRouter><AccountDeletionPage /></MemoryRouter>); fill();
  fireEvent.click(screen.getByRole('button', { name: 'Check deletion status' }));
  await screen.findByText('Stage: backend only');
  expect(screen.queryByRole('button', { name: 'Verify password & restore account' })).toBeNull();
});
