import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ActiveUsersTrendChart } from './active-users-chart';
import { api } from './api';
vi.mock('./api', () => ({ api: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('loads weekly accounts, switches calendar periods and preserves the chart toggle', async () => {
  vi.mocked(api).mockResolvedValue({ buckets: [{ start: '2026-10-12T00:00:00Z', count: 5 }] });
  render(<ActiveUsersTrendChart />);
  await screen.findByRole('img');
  expect(api).toHaveBeenCalledWith('/api/admin/activity-trend?period=week');
  fireEvent.change(screen.getByLabelText('Activity period'), { target: { value: 'month' } });
  await waitFor(() => expect(api).toHaveBeenCalledWith('/api/admin/activity-trend?period=month'));
  await screen.findByRole('img');
  fireEvent.click(screen.getByRole('button', { name: 'Line Graph' }));
  expect(screen.getByRole('button', { name: 'Line Graph' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByText('2026-10-12')).toBeTruthy();
});
it('shows a failed request and lets the admin retry', async () => {
  vi.mocked(api).mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValue({ buckets: [] });
  render(<ActiveUsersTrendChart />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByText('No recorded activity in these periods.');
});
