# Review package — Task 2 (working tree)

## admin/src/guards.tsx
```tsx
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
```

## admin/src/router.tsx
```tsx
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useParams,
  useSearchParams,
} from 'react-router';
import { ForgotPage, LoginPage, ResetPage } from './auth-pages';
import { RequireGuest, RequireStaff } from './guards';
import { PublicLandingPage } from './pages-landing';
import { NotificationsPage, ConsentPage } from './pages-notify';
import {
  ChurchesPage,
  DeletionsPage,
  GroupsPage,
  OverviewPage,
  ReportsPage,
  ScoringPage,
} from './pages-ops';
import { PastorPortalPage } from './pages-pastor';
import { PeoplePage } from './pages-people';
import { PuzzlesStudioPage } from './pages-puzzles';
import { QuestsPage } from './pages-content';
import { PublishedWeeksPage } from './pages-weeks';
import { isDashboardTab } from './path-helpers';
import type { Tab } from './route';
import { Shell } from './shell';

function DashboardLayout() {
  const params = useParams();
  const tab: Tab =
    params.tab && isDashboardTab(params.tab) ? params.tab : 'dashboard';

  return (
    <RequireStaff>
      <Shell tab={tab}>
        <Outlet />
      </Shell>
    </RequireStaff>
  );
}

function DashboardTabPage() {
  const { tab } = useParams();
  if (!tab || !isDashboardTab(tab) || tab === 'dashboard') {
    return <Navigate to="/app/dashboard" replace />;
  }

  const page = {
    people: <PeoplePage />,
    churches: <ChurchesPage />,
    groups: <GroupsPage />,
    weeks: <PublishedWeeksPage />,
    quests: <QuestsPage />,
    puzzles: <PuzzlesStudioPage />,
    notifications: <NotificationsPage />,
    consent: <ConsentPage />,
    reports: <ReportsPage />,
    deletions: <DeletionsPage />,
    scoring: <ScoringPage />,
  }[tab];

  return page ?? <Navigate to="/app/dashboard" replace />;
}

function ResetRoute() {
  const [params] = useSearchParams();
  return <ResetPage token={params.get('token') ?? ''} />;
}

function PastorRoute() {
  const { churchId } = useParams();
  return <PastorPortalPage churchIdFromRoute={churchId} />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicLandingPage />} />
      <Route
        path="/app/login"
        element={
          <RequireGuest>
            <LoginPage />
          </RequireGuest>
        }
      />
      <Route
        path="/app/forgot"
        element={
          <RequireGuest>
            <ForgotPage />
          </RequireGuest>
        }
      />
      <Route
        path="/app/reset"
        element={
          <RequireGuest>
            <ResetRoute />
          </RequireGuest>
        }
      />
      <Route path="/app/dashboard" element={<DashboardLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path=":tab" element={<DashboardTabPage />} />
      </Route>
      <Route path="/groups" element={<PastorRoute />} />
      <Route path="/groups/:churchId" element={<PastorRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

## admin/src/router.test.tsx
```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { AppRoutes } from './router';
import { clearPastorSession, setToken } from './api';

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return {
    ...actual,
    api: vi.fn(async (path: string) => {
      if (path === '/api/admin/stats') {
        return {
          families: 0,
          groups: 0,
          kidsOnParentAccount: 0,
          standaloneTeens: 0,
          pastors: 0,
          churchStaff: 0,
          churches: 0,
          dashboardAdmins: 0,
          openReports: 0,
        };
      }
      if (path === '/api/admin/people') {
        return { users: [], children: [], families: [] };
      }
      if (path === '/api/admin/groups') return [];
      if (path === '/api/admin/scoring-rules') return {};
      return [];
    }),
    login: vi.fn(),
    pastorLogin: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  };
});

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{`${loc.pathname}${loc.search}`}</div>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  cleanup();
  setToken(null);
  clearPastorSession();
  window.location.hash = '';
});

describe('AppRoutes', () => {
  it('renders landing at /', async () => {
    renderAt('/');
    expect(await screen.findByText(/Nurturing Teen Discipleship/i)).toBeTruthy();
  });

  it('redirects unauthed /app/dashboard to login with next', async () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <LocationProbe />
        <AppRoutes />
      </MemoryRouter>,
    );
    expect(await screen.findByPlaceholderText('Email')).toBeTruthy();
    expect(screen.getByTestId('loc').textContent).toBe(
      '/app/login?next=%2Fapp%2Fdashboard',
    );
  });

  it('renders People inside Shell when authed at /app/dashboard/people', async () => {
    setToken('test-token');
    renderAt('/app/dashboard/people');
    expect(await screen.findByText('Users (0)')).toBeTruthy();
  });

  it('redirects invalid tab to overview', async () => {
    setToken('test-token');
    renderAt('/app/dashboard/not-a-tab');
    expect(await screen.findByText('Community snapshot')).toBeTruthy();
  });

  it('renders pastor portal at /groups', async () => {
    renderAt('/groups');
    expect(await screen.findByText('Pastor Sign In')).toBeTruthy();
  });
});
```

