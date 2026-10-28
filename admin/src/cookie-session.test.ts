import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => { vi.resetModules(); localStorage.clear(); });
afterEach(() => { vi.unstubAllGlobals(); });
const user = { id: 'staff', role: 'SUPER_ADMIN', name: 'Manager' };
it('signs in with cookie credentials, keeps secrets out of storage and sends no staff bearer', async () => {
  localStorage.setItem('askhub_admin_token', 'legacy-secret');
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify({ user, expiresAt: Date.now() + 604800000 }) })
    .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '{}' });
  vi.stubGlobal('fetch', fetcher);
  const client = await import('./api');
  await client.login('manager@test.invalid', 'test-password');
  expect(fetcher.mock.calls[0]![1]).toMatchObject({ credentials: 'include', headers: { 'X-Dashboard-Request': '1' } });
  expect(JSON.parse(fetcher.mock.calls[0]![1].body).surface).toBe('dashboard');
  expect(localStorage.getItem('askhub_admin_token')).toBeNull();
  expect(localStorage.getItem('askhub_admin_user')).toBeNull();
  await client.api('/api/puzzles');
  expect(fetcher.mock.calls[1]![1].headers.authorization).toBeUndefined();
});
it('restores session metadata from the server after a browser refresh', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user, expiresAt: Date.now() + 50000 }) }));
  const client = await import('./api');
  expect(client.staffSessionReady()).toBe(false);
  await client.initializeStaffSession();
  expect(client.staffSessionReady()).toBe(true);
  expect(client.getUser()).toEqual(user);
  expect(client.getToken()).toBe('cookie-session');
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/dashboard-session'), expect.objectContaining({ credentials: 'include', cache: 'no-store' }));
});
it('only finishes logout when the server has cleared the cookie', async () => {
  const client = await import('./api'); client.setToken('cookie-session', user);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true }));
  await expect(client.logout()).rejects.toThrow('Could not sign out');
  expect(client.getToken()).toBe('cookie-session');
  await client.logout();
  expect(client.getToken()).toBeNull();
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/dashboard-logout'), expect.objectContaining({ method: 'POST', credentials: 'include', headers: { 'X-Dashboard-Request': '1' } }));
});
