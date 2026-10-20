import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AccountDeletionQueue } from './account-deletion-queue';
const { apiMock, promptMock, confirmMock } = vi.hoisted(() => ({ apiMock: vi.fn(), promptMock: vi.fn(), confirmMock: vi.fn() }));
vi.mock('./api', () => ({ api: apiMock }));
vi.mock('./prompt-dialog', () => ({ askPrompt: promptMock, askConfirm: confirmMock }));
const row = { id: 'job-1', label: 'Example account', stage: 'recoverable', requestedAt: '2026-10-18T12:00:00Z', recoverableUntil: '2026-11-17T12:00:00Z', purgeAfter: '2027-01-16T12:00:00Z', accounts: 2, families: 1, groups: 1, ministry: false };
beforeEach(() => { apiMock.mockReset(); promptMock.mockReset().mockResolvedValue('actor-password'); confirmMock.mockReset().mockResolvedValue(true); });
afterEach(cleanup);
it('files a request in archive with password verification and explains that purge timing stays unchanged', async () => {
  apiMock.mockResolvedValueOnce([row]).mockResolvedValueOnce({ archived: true }).mockResolvedValueOnce([]);
  render(<AccountDeletionQueue />);
  fireEvent.click(await screen.findByRole('button', { name: 'Move to archive' }));
  await waitFor(() => expect(apiMock).toHaveBeenCalledWith('/api/admin/account-deletions/job-1/archive', { method: 'POST', body: JSON.stringify({ password: 'actor-password' }) }));
  expect(promptMock).toHaveBeenCalledWith('Confirm your password', expect.objectContaining({ inputType: 'password' }));
  expect(await screen.findByText('Moved to archive. The 90-day personal-data purge deadline is unchanged.')).toBeTruthy();
});
it('requires explicit destructive confirmation and a password before immediate purge', async () => {
  apiMock.mockResolvedValueOnce([row]).mockResolvedValueOnce({ purged: true }).mockResolvedValueOnce([]);
  render(<AccountDeletionQueue />);
  fireEvent.click(await screen.findByRole('button', { name: 'Delete completely now' }));
  await waitFor(() => expect(apiMock).toHaveBeenCalledWith('/api/admin/account-deletions/job-1/purge', { method: 'POST', body: JSON.stringify({ password: 'actor-password', confirmation: 'PURGE PERMANENTLY' }) }));
  expect(confirmMock).toHaveBeenCalledOnce(); expect(promptMock).toHaveBeenCalledOnce();
});
it('does not purge when the admin cancels confirmation', async () => {
  apiMock.mockResolvedValue([row]); confirmMock.mockResolvedValue(false);
  render(<AccountDeletionQueue />);
  fireEvent.click(await screen.findByRole('button', { name: 'Delete completely now' }));
  await waitFor(() => expect(confirmMock).toHaveBeenCalledOnce());
  expect(apiMock).toHaveBeenCalledTimes(1); expect(promptMock).not.toHaveBeenCalled();
});
it('shows a Users archive audit entry after personal data was purged', async () => {
  apiMock.mockResolvedValue([{ ...row, label: 'Deleted account', stage: 'purged', archivedAt: '2026-10-19T12:00:00Z' }]);
  render(<AccountDeletionQueue archiveScope="ACCOUNT" />);
  expect(await screen.findByText('Personal data purged; anonymized audit entry retained.')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Users archive' })).toBeTruthy();
  expect(apiMock).toHaveBeenCalledWith('/api/admin/account-deletions/archive?scope=ACCOUNT');
  expect(screen.queryByRole('button', { name: 'Restore linked resources' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Delete completely now' })).toBeNull();
});
