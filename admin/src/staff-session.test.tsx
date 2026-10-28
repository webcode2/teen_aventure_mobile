import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, apiUpload, getPastorToken, getToken, setPastorSession, setToken, staffTokenExpiresAt } from './api';
import { RequireStaff } from './guards';


function Login() { const location = useLocation(); return <div>Login {location.search}</div>; }
function mount() {
  render(<MemoryRouter initialEntries={['/app/dashboard/puzzles/library?status=draft']}><Routes>
    <Route path="/app/dashboard/puzzles/library" element={<RequireStaff><div>Library</div></RequireStaff>} />
    <Route path="/app/login" element={<Login />} />
  </Routes></MemoryRouter>);
}
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); setToken(null); setPastorSession(null); window.history.replaceState(null, '', '/'); });

describe('staff session expiry and rejected access', () => {
  it('redirects expired tokens to login with the original destination', () => {
    setToken('cookie-session', undefined, Date.now() - 1000);
    mount();
    expect(screen.getByText(/Login/).textContent).toContain('next=%2Fapp%2Fdashboard%2Fpuzzles%2Flibrary%3Fstatus%3Ddraft');
    expect(getToken()).toBeNull();
  });
  it('redirects an open page when its token expires without another request', () => {
    vi.useFakeTimers();
    setToken('cookie-session', undefined, Date.now() + 2000);
    mount();
    expect(screen.getByText('Library')).toBeTruthy();
    act(() => vi.advanceTimersByTime(2100));
    expect(screen.getByText(/Login/)).toBeTruthy();
    expect(localStorage.getItem('askhub_admin_token')).toBeNull();
  });
  it.each([401, 403])('clears a rejected staff session (%s), redirects, and keeps ministry login', async (status) => {
    window.history.replaceState(null, '', '/app/dashboard/puzzles/library');
    setToken('cookie-session', undefined, Date.now() + 3600000);
    setPastorSession('ministry-token');
    mount();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({ message: status === 403 ? 'Insufficient dashboard role.' : 'Unauthorized' }) }));
    await act(async () => { await expect(api('/api/puzzles')).rejects.toThrow(); });
    expect(screen.getByText(/Login/)).toBeTruthy();
    expect(getPastorToken()).toBe('ministry-token');
  });
  it('does not sign out for an ordinary permission denial or a stale response', async () => {
    window.history.replaceState(null, '', '/app/dashboard/puzzles');
    const original = 'cookie-session';
    setToken(original);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ message: 'You cannot delete this puzzle' }) }));
    await expect(api('/api/puzzles')).rejects.toThrow();
    expect(getToken()).toBe(original);
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      setToken('new-session');
      return { ok: false, status: 401, json: async () => ({ message: 'Unauthorized' }) };
    }));
    await expect(api('/api/puzzles')).rejects.toThrow();
    expect(getToken()).toBe('new-session');
  });
  it('also handles rejected upload sessions', async () => {
    window.history.replaceState(null, '', '/app/dashboard/content-web');
    setToken('staff-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'Unauthorized' }) }));
    await expect(apiUpload('/api/media', new File(['x'], 'image.png'), 'file')).rejects.toThrow();
    expect(getToken()).toBeNull();
  });
  it('keeps only server-provided expiry metadata and never persists staff credentials', () => {
    setToken('cookie-session', undefined, 1800000000000);
    expect(staffTokenExpiresAt()).toBe(1800000000000);
    expect(localStorage.getItem('askhub_admin_token')).toBeNull();
    expect(localStorage.getItem('askhub_admin_user')).toBeNull();
  });
});
