import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { getToken, setToken, staffTokenExpiresAt, subscribeStaffSession, initializeStaffSession, staffSessionReady } from './api';
import { legacyHashToPath } from './path-helpers';

function useStaffSession() {
  const ready = useSyncExternalStore(subscribeStaffSession, staffSessionReady, () => false);
  useEffect(() => { void initializeStaffSession(); }, []);
  const token = useSyncExternalStore(subscribeStaffSession, getToken, () => null);
  const expiresAt = useSyncExternalStore(subscribeStaffSession, staffTokenExpiresAt, () => null);
  useEffect(() => {
    if (expiresAt == null) return;
    const expire = () => {
      if (expiresAt <= Date.now()) setToken(null);
    };
    const timer = window.setTimeout(expire, Math.min(Math.max(0, expiresAt - Date.now()), 2_147_483_647));
    window.addEventListener('focus', expire);
    document.addEventListener('visibilitychange', expire);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', expire);
      document.removeEventListener('visibilitychange', expire);
    };
  }, [token, expiresAt]);
  return { token, ready };
}

export function RequireStaff({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { token, ready } = useStaffSession();
  if (!ready) return <p role="status">Checking your session…</p>;
  if (!token) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/app/login?next=${next}`} replace />;
  }
  return children;
}

export function RequireGuest({ children }: { children: ReactNode }) {
  const { token, ready } = useStaffSession();
  if (!ready) return <p role="status">Checking your session…</p>;
  if (token) return <Navigate to="/app/dashboard" replace />;
  return children;
}

export function LegacyHashRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const mapped = legacyHashToPath(window.location.hash);
    if (!mapped) return;

    const url = new URL(mapped, window.location.origin);
    const { pathname, search } = window.location;
    window.history.replaceState(null, '', `${pathname}${search}`);
    navigate(`${url.pathname}${url.search}`, { replace: true });
  }, [navigate]);

  return null;
}
