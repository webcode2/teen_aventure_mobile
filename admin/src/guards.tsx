import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { getToken } from './api';
import { legacyHashToPath } from './path-helpers';

export function RequireStaff({ children }: { children: ReactNode }) {
  const location = useLocation();
  if (!getToken()) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/app/login?next=${next}`} replace />;
  }
  return children;
}

export function RequireGuest({ children }: { children: ReactNode }) {
  if (getToken()) return <Navigate to="/app/dashboard" replace />;
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
