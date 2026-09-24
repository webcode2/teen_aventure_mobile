### Task 2: Guards + route tree (TDD)

**Files:**
- Create: `admin/src/guards.tsx`
- Create: `admin/src/router.tsx`
- Create: `admin/src/router.test.tsx`
- Modify: `admin/src/shell.tsx` (accept `Outlet` / derive tab from params — minimal change in this task)

**Interfaces:**
- Consumes: `getToken` from `./api`; helpers from `./path-helpers`; page components; `Shell`
- Produces:
  - `RequireStaff` / `RequireGuest` / `LegacyHashRedirect` components
  - `AppRoutes` — the `<Routes>` element tree

- [ ] **Step 1: Write failing router tests**

Create `admin/src/router.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from './router';
import { setToken, clearPastorSession } from './api';

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return {
    ...actual,
    api: vi.fn(async (path: string) => {
      if (path === '/api/admin/stats') {
        return {
          families: 0, groups: 0, kidsOnParentAccount: 0, standaloneTeens: 0,
          pastors: 0, churchStaff: 0, churches: 0, dashboardAdmins: 0, openReports: 0,
        };
      }
      if (path === '/api/admin/people') return { users: [], children: [], families: [] };
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
    expect(await screen.findByText(/Pastor/i)).toBeTruthy();
  });
});
```

Also define (above `renderAt`) in the same file:

```tsx
import { useLocation } from 'react-router';

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{`${loc.pathname}${loc.search}`}</div>;
}
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd admin && npm test -- src/router.test.tsx
```

Expected: FAIL (missing module).

- [ ] **Step 3: Implement guards**

Create `admin/src/guards.tsx`:

```tsx
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useEffect } from 'react';
import { getToken } from './api';
import { legacyHashToPath, safeStaffNext } from './path-helpers';

export function RequireStaff({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!getToken()) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/app/login?next=${next}`} replace />;
  }
  return children;
}

export function RequireGuest({ children }: { children: React.ReactNode }) {
  if (getToken()) return <Navigate to="/app/dashboard" replace />;
  return children;
}

export function LegacyHashRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const mapped = legacyHashToPath(window.location.hash);
    if (!mapped) return;
    const url = new URL(mapped, window.location.origin);
    navigate(`${url.pathname}${url.search}`, { replace: true });
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }, [navigate]);
  return null;
}
```

Clearing hash: after navigate, set `window.location.hash = ''` via `history.replaceState` on the path URL without hash:

```ts
const { pathname, search } = window.location;
window.history.replaceState(null, '', `${pathname}${search}`);
```

Call this **before** `navigate` so the URL becomes path-only.

- [ ] **Step 4: Implement `AppRoutes`**

Create `admin/src/router.tsx`:

```tsx
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router';
import { ForgotPage, LoginPage, ResetPage } from './auth-pages';
import { PublicLandingPage } from './pages-landing';
import { PastorPortalPage } from './pages-pastor';
import { QuestsPage } from './pages-content';
import { PublishedWeeksPage } from './pages-weeks';
import { PuzzlesStudioPage } from './pages-puzzles';
import { NotificationsPage, ConsentPage } from './pages-notify';
import { ChurchesPage, DeletionsPage, GroupsPage, OverviewPage, ReportsPage, ScoringPage } from './pages-ops';
import { PeoplePage } from './pages-people';
import { Shell } from './shell';
import { RequireGuest, RequireStaff } from './guards';
import { isDashboardTab } from './path-helpers';
import type { Tab } from './route';
import { useSearchParams } from 'react-router';

function DashboardLayout() {
  const params = useParams();
  const tab: Tab = params.tab && isDashboardTab(params.tab) ? params.tab : 'dashboard';
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
  if (!tab || !isDashboardTab(tab)) return <Navigate to="/app/dashboard" replace />;
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

- [ ] **Step 5: Run router tests — expect PASS**

```bash
cd admin && npm test -- src/router.test.tsx src/path-helpers.test.ts
```

Expected: PASS. Fix pastor assertion text if the gateway copy differs (read `pages-pastor.tsx` for a stable string like `Church Pastor` or email placeholder).

- [ ] **Step 6: Commit** (only if user asked)

---

