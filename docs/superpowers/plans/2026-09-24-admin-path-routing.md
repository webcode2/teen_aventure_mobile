# Admin Path Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin SPA hash router with path-based React Router URLs (`/`, `/app/dashboard/:tab`, `/groups`) plus staff/guest guards and legacy hash redirects.

**Architecture:** Install `react-router`, keep `TABS`/`Tab` in `route.ts`, add path helpers + `RequireStaff`/`RequireGuest` + a `<Routes>` tree. `BrowserRouter` wraps the app in `main.tsx`. Call sites stop using `navigate({ kind })` / `window.location.hash` and use `useNavigate` / `Link` / `useSearchParams` instead. Tests use `MemoryRouter`.

**Tech Stack:** Vite 8, React 19, `react-router` ^8, Vitest + Testing Library, Fastify static SPA fallback.

**Spec:** `docs/superpowers/specs/2026-09-24-admin-path-routing-design.md`

## Global Constraints

- Scope is `admin/` (+ Fastify SPA fallback in `backend/src/index.ts` only). No Flutter or API path changes.
- Do **not** re-add Word Scramble / `scrambleQuiz`.
- Do **not** git commit unless the user explicitly asks in chat (skip Commit steps until then).
- Landing at `/` stays public even when staff JWT is present (no force-redirect to dashboard).
- Overview is only `/app/dashboard` (index). `:tab` allowlist is `TABS` **except** `dashboard`.
- Invalid `:tab` → redirect `/app/dashboard`. Unknown paths → redirect `/`.
- Pastor URLs: `/groups` and `/groups/:churchId` (not staff login).

## File map

| File | Responsibility |
|------|----------------|
| Create: `admin/src/path-helpers.ts` | `DASHBOARD_TAB_IDS`, `isDashboardTab`, `safeStaffNext`, `legacyHashToPath` |
| Create: `admin/src/guards.tsx` | `RequireStaff`, `RequireGuest`, `LegacyHashRedirect` |
| Create: `admin/src/router.tsx` | `<Routes>` tree + `DashboardShell` layout with `<Outlet>` |
| Create: `admin/src/path-helpers.test.ts` | Unit tests for helpers |
| Create: `admin/src/router.test.tsx` | Guard + route smoke with `MemoryRouter` |
| Modify: `admin/package.json` | Add `react-router` |
| Modify: `admin/src/route.ts` | Keep `TABS`/`Tab` only; delete hash router |
| Modify: `admin/src/App.tsx` | Re-export router (or thin wrapper) |
| Modify: `admin/src/main.tsx` | `BrowserRouter` + `LegacyHashRedirect` + routes |
| Modify: `admin/src/shell.tsx` | Path nav; derive `tab` from URL |
| Modify: `admin/src/top-nav.tsx` | `useNavigate` paths |
| Modify: `admin/src/auth-pages.tsx` | Guest nav + login `next` |
| Modify: `admin/src/pages-landing.tsx` | Path links |
| Modify: `admin/src/pages-pastor.tsx` | `/groups` paths; drop hash writes |
| Modify: `admin/src/pages-ops.tsx` | Path shortcuts |
| Modify: `admin/src/pages-content.tsx` | `useSearchParams` for `?week=` |
| Modify: `admin/src/pages-weeks.tsx` | Navigate to `/app/dashboard/quests?week=` |
| Modify: `admin/src/App.test.tsx` | `MemoryRouter` + new defaults |
| Modify: `backend/src/index.ts` | SPA fallback for `/app` and `/groups` |

---

### Task 1: Install react-router + path helpers (TDD)

**Files:**
- Modify: `admin/package.json` (via npm)
- Create: `admin/src/path-helpers.ts`
- Create: `admin/src/path-helpers.test.ts`
- Modify: `admin/src/route.ts` (slim to `TABS` / `Tab` only after helpers exist)

**Interfaces:**
- Consumes: `Tab`, `TABS` from `./route`
- Produces:
  - `DASHBOARD_TAB_IDS: readonly Tab[]` — `TABS` without `'dashboard'`
  - `isDashboardTab(value: string): value is Tab` — true only for allowlisted non-overview tabs
  - `safeStaffNext(next: string | null): string` — returns `next` only if it is a path under `/app/dashboard` (exact or with further segments/search); else `/app/dashboard`
  - `legacyHashToPath(hash: string): string | null` — maps old `#/...` to a path; `null` if no hash route

- [ ] **Step 1: Install dependency**

```bash
cd admin && npm install react-router@^8
```

Expected: `react-router` listed in `dependencies`.

- [ ] **Step 2: Write failing helper tests**

Create `admin/src/path-helpers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isDashboardTab, safeStaffNext, legacyHashToPath } from './path-helpers';

describe('isDashboardTab', () => {
  it('accepts people and rejects dashboard and junk', () => {
    expect(isDashboardTab('people')).toBe(true);
    expect(isDashboardTab('dashboard')).toBe(false);
    expect(isDashboardTab('nope')).toBe(false);
  });
});

describe('safeStaffNext', () => {
  it('allows dashboard paths and rejects others', () => {
    expect(safeStaffNext('/app/dashboard')).toBe('/app/dashboard');
    expect(safeStaffNext('/app/dashboard/people')).toBe('/app/dashboard/people');
    expect(safeStaffNext('/app/dashboard/quests?week=3')).toBe('/app/dashboard/quests?week=3');
    expect(safeStaffNext('/groups')).toBe('/app/dashboard');
    expect(safeStaffNext('https://evil.example/')).toBe('/app/dashboard');
    expect(safeStaffNext(null)).toBe('/app/dashboard');
  });
});

describe('legacyHashToPath', () => {
  it('maps known hashes', () => {
    expect(legacyHashToPath('#/landing')).toBe('/');
    expect(legacyHashToPath('#/login')).toBe('/app/login');
    expect(legacyHashToPath('#/forgot')).toBe('/app/forgot');
    expect(legacyHashToPath('#/reset?token=abc')).toBe('/app/reset?token=abc');
    expect(legacyHashToPath('#/dashboard')).toBe('/app/dashboard');
    expect(legacyHashToPath('#/people')).toBe('/app/dashboard/people');
    expect(legacyHashToPath('#/pastor')).toBe('/groups');
    expect(legacyHashToPath('#/church/ch_1')).toBe('/groups/ch_1');
    expect(legacyHashToPath('')).toBe(null);
    expect(legacyHashToPath('#/unknown-tab')).toBe('/app/dashboard');
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
cd admin && npm test -- src/path-helpers.test.ts
```

Expected: FAIL (module not found / exports missing).

- [ ] **Step 4: Implement helpers**

Create `admin/src/path-helpers.ts`:

```ts
import { TABS, type Tab } from './route';

export const DASHBOARD_TAB_IDS = TABS.filter((t): t is Exclude<Tab, 'dashboard'> => t !== 'dashboard');

export function isDashboardTab(value: string): value is Tab {
  return (DASHBOARD_TAB_IDS as readonly string[]).includes(value);
}

export function safeStaffNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/app/dashboard';
  const pathOnly = next.split('?')[0] ?? next;
  if (pathOnly === '/app/dashboard' || pathOnly.startsWith('/app/dashboard/')) return next;
  return '/app/dashboard';
}

export function legacyHashToPath(hash: string): string | null {
  const raw = (hash || '').replace(/^#/, '');
  if (!raw) return null;
  const [pathPart, queryPart = ''] = raw.split('?');
  const segments = pathPart.replace(/^\//, '').split('/').filter(Boolean);
  const page = (segments[0] || '').toLowerCase();
  const sub = segments[1] || '';
  const qs = queryPart ? `?${queryPart}` : '';

  if (page === 'landing' || page === 'home' || page === 'public') return '/';
  if (page === 'login') return '/app/login';
  if (page === 'forgot') return '/app/forgot';
  if (page === 'reset') return `/app/reset${qs}`;
  if (page === 'pastor' || page === 'church-portal') {
    const church = sub || new URLSearchParams(queryPart).get('church') || '';
    return church ? `/groups/${church}` : '/groups';
  }
  if (page === 'church') return sub ? `/groups/${sub}` : '/groups';
  if (page === 'dashboard' || page === '') return '/app/dashboard';
  if ((TABS as readonly string[]).includes(page) && page !== 'dashboard') {
    return `/app/dashboard/${page}${qs}`;
  }
  if (page) return '/app/dashboard';
  return null;
}
```

Slim `admin/src/route.ts` to:

```ts
export const TABS = [
  'dashboard',
  'people',
  'churches',
  'groups',
  'weeks',
  'quests',
  'puzzles',
  'notifications',
  'consent',
  'reports',
  'deletions',
  'scoring',
] as const;

export type Tab = (typeof TABS)[number];
```

Delete `AuthView`, `Route`, `parseHash`, `hashFor`, `navigate` from this file. Do **not** update call sites yet (they will break compile until later tasks — if `tsc` is run via tests only, Vitest still compiles changed modules; leave call sites until Task 3–5, or temporarily keep stub `navigate` that throws — prefer updating imports in Tasks 3–5 in order).

**Interim:** After Step 4, only `path-helpers` + slim `route.ts` must compile. Call sites still import `navigate` — restore a temporary deprecated stub in `route.ts` until Task 5 removes it:

```ts
/** @deprecated Removed in path-routing migration; do not use. */
export function navigate(_route: unknown): void {
  throw new Error('navigate() removed — use react-router useNavigate');
}
```

Remove the stub in Task 5 once all call sites are migrated.

- [ ] **Step 5: Run helper tests — expect PASS**

```bash
cd admin && npm test -- src/path-helpers.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit** (only if user asked)

```bash
git add admin/package.json admin/package-lock.json admin/src/route.ts admin/src/path-helpers.ts admin/src/path-helpers.test.ts
git commit -m "$(cat <<'EOF'
feat(admin): add path helpers and react-router dependency

EOF
)"
```

---

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

### Task 3: Wire `main.tsx` / `App.tsx`

**Files:**
- Modify: `admin/src/main.tsx`
- Modify: `admin/src/App.tsx`

**Interfaces:**
- Consumes: `AppRoutes`, `LegacyHashRedirect`, `BrowserRouter`
- Produces: App boots on History API paths

- [ ] **Step 1: Replace `App.tsx`**

```tsx
import { AppRoutes } from './router';
import './studio/studio.css';

export default function App() {
  return <AppRoutes />;
}
```

- [ ] **Step 2: Wrap with BrowserRouter in `main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import App from './App';
import { LegacyHashRedirect } from './guards';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LegacyHashRedirect />
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

No `basename` in v1 (paths match the design literally). If production later serves only under `/admin/`, set Vite `base: '/admin/'` and `basename="/admin"` together — out of scope unless deploy breaks.

- [ ] **Step 3: Smoke-check build types for new entry**

```bash
cd admin && npx tsc -b --pretty false 2>&1 | head -40
```

Expected: errors only from remaining `navigate` imports in pages (Task 4–5). Entry/`router`/`guards` should be clean.

- [ ] **Step 4: Commit** (only if user asked)

---

### Task 4: Shell + TopNav path navigation

**Files:**
- Modify: `admin/src/shell.tsx`
- Modify: `admin/src/top-nav.tsx`

**Interfaces:**
- Consumes: `useNavigate` from `react-router`; existing `tab: Tab` prop from layout
- Produces: Sidebar/top actions update the URL

- [ ] **Step 1: Update `shell.tsx` sidebar click**

Replace `import { navigate, type Tab } from './route'` with:

```ts
import { useNavigate } from 'react-router';
import type { Tab } from './route';
```

Inside `Shell`, `const navigate = useNavigate();`

Replace sidebar `onClick`:

```ts
onClick={() => {
  closeMobileNav();
  navigate(id === 'dashboard' ? '/app/dashboard' : `/app/dashboard/${id}`);
}}
```

- [ ] **Step 2: Update `top-nav.tsx`**

```ts
import { useNavigate } from 'react-router';
```

```ts
const navigate = useNavigate();
// notifications:
onClick={() => navigate('/app/dashboard/notifications')}
// new quest:
onClick={() => navigate('/app/dashboard/quests')}
// sign out:
onClick={() => {
  setToken(null);
  navigate('/app/login');
}}
```

Remove `import { navigate } from './route'`.

- [ ] **Step 3: Manual sanity** — `cd admin && npm run dev`, open `/app/login`, sign-in flow deferred until auth pages updated; sidebar works once authed via `setToken` in console if needed.

- [ ] **Step 4: Commit** (only if user asked)

---

### Task 5: Auth, landing, pastor, weeks, content, ops call sites

**Files:**
- Modify: `admin/src/auth-pages.tsx`
- Modify: `admin/src/pages-landing.tsx`
- Modify: `admin/src/pages-pastor.tsx`
- Modify: `admin/src/pages-weeks.tsx`
- Modify: `admin/src/pages-content.tsx`
- Modify: `admin/src/pages-ops.tsx`
- Modify: `admin/src/route.ts` — delete temporary `navigate` stub

**Interfaces:**
- Consumes: `useNavigate`, `useSearchParams`, `safeStaffNext`
- Produces: Zero remaining `navigate` / `window.location.hash` routing writes in admin src

- [ ] **Step 1: `auth-pages.tsx`**

```ts
import { useNavigate, useSearchParams } from 'react-router';
import { safeStaffNext } from './path-helpers';
```

`LoginPage`:

```ts
const navigate = useNavigate();
const [searchParams] = useSearchParams();

async function submit(e: React.FormEvent) {
  e.preventDefault();
  setBusy(true);
  setError('');
  try {
    await login(email, password);
    navigate(safeStaffNext(searchParams.get('next')));
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Login failed');
  } finally {
    setBusy(false);
  }
}
```

Replace other navigations:

| Old | New |
|-----|-----|
| `navigate({ kind: 'auth', view: 'forgot' })` | `navigate('/app/forgot')` |
| `navigate({ kind: 'auth', view: 'login' })` | `navigate('/app/login')` |
| `navigate({ kind: 'pastor' })` | `navigate('/groups')` |
| `navigate({ kind: 'landing' })` | `navigate('/')` |

Same pattern in `ForgotPage` / `ResetPage`.

- [ ] **Step 2: `pages-landing.tsx`**

Replace all `navigate({ kind: 'pastor' })` → `navigate('/groups')`, `navigate({ kind: 'auth', view: 'login' })` → `navigate('/app/login')`. Add `const navigate = useNavigate()` at component top(s) that use it; remove `route` import.

- [ ] **Step 3: `pages-pastor.tsx`**

```ts
import { useNavigate } from 'react-router';
```

After successful pastor login:

```ts
if (me.churchId) {
  setAssignedChurchId(me.churchId);
  navigate(`/groups/${me.churchId}`, { replace: true });
} else {
  navigate('/groups', { replace: true });
}
```

Sign out: `navigate('/groups', { replace: true })`.

Boundary “switch back”: `navigate(`/groups/${assignedChurchId}`)`.

Replace `navigate({ kind: 'landing' })` → `navigate('/')`, `navigate({ kind: 'auth', view: 'login' })` → `navigate('/app/login')`.

Delete all `window.location.hash = ...` assignments.

- [ ] **Step 4: `pages-weeks.tsx`**

```ts
navigate(`/app/dashboard/quests?week=${weekNumber}`);
```

Remove `window.location.hash` and `askhub:route` dispatch. Use `useNavigate`.

- [ ] **Step 5: `pages-content.tsx`**

```ts
import { useSearchParams } from 'react-router';

// inside component:
const [searchParams] = useSearchParams();
useEffect(() => {
  load();
  const weekParam = searchParams.get('week');
  if (weekParam) {
    const num = Number(weekParam);
    if (!Number.isNaN(num) && num > 0) editWeek(num);
  }
}, [searchParams]);
```

Weeks shortcut: `navigate('/app/dashboard/weeks')`.

- [ ] **Step 6: `pages-ops.tsx`**

```ts
navigate('/app/dashboard/quests');
navigate('/app/dashboard/puzzles');
```

- [ ] **Step 7: Remove stub `navigate` from `route.ts`**

`route.ts` must only export `TABS` and `Tab`.

- [ ] **Step 8: Grep for leftovers**

```bash
cd admin && rg "from '\\./route'|navigate\\(|window\\.location\\.hash|askhub:route|parseHash|hashFor" src
```

Expected: only `Tab`/`TABS` imports from `route`; hash only in `LegacyHashRedirect` / tests clearing hash; no `askhub:route`.

- [ ] **Step 9: Commit** (only if user asked)

---

### Task 6: Update `App.test.tsx` + legacy hash test

**Files:**
- Modify: `admin/src/App.test.tsx`
- Modify: `admin/src/router.test.tsx` (add one legacy hash case if not already)

**Interfaces:**
- Consumes: `MemoryRouter`, `App` or `AppRoutes`
- Produces: Full suite green with path defaults

- [ ] **Step 1: Add test helper**

At top of `App.test.tsx`:

```tsx
import { MemoryRouter } from 'react-router';

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
```

Replace every `render(<App />)` with the appropriate path:

| Test intent | `path` |
|-------------|--------|
| Login / forgot / login error | `/app/login` |
| Authed dashboard / sidebar | `/app/dashboard` |
| Landing | `/` |
| Pastor | `/groups` |

Remove `window.location.hash = '#/landing'` / `#/pastor` assignments for those tests; use `renderApp('/')` and `renderApp('/groups')`.

Keep `window.location.hash = ''` in `beforeEach` for isolation.

- [ ] **Step 2: Add legacy hash redirect test in `router.test.tsx`**

```tsx
it('maps legacy #/people hash to people tab when authed', async () => {
  setToken('test-token');
  window.location.hash = '#/people';
  render(
    <MemoryRouter initialEntries={['/']}>
      <LegacyHashRedirect />
      <AppRoutes />
    </MemoryRouter>,
  );
  expect(await screen.findByText('Users (0)')).toBeTruthy();
});
```

Import `LegacyHashRedirect` from `./guards`.

- [ ] **Step 3: Run full admin tests**

```bash
cd admin && npm test
```

Expected: all PASS. Fix any copy/selectors that assumed default route was login.

- [ ] **Step 4: Commit** (only if user asked)

---

### Task 7: Fastify SPA fallback for new paths

**Files:**
- Modify: `backend/src/index.ts` (~lines 91–99)

**Interfaces:**
- Consumes: existing `adminDist` static serve
- Produces: Deep links `/app/...` and `/groups/...` return `index.html`

- [ ] **Step 1: Extend not-found handler**

```ts
app.setNotFoundHandler((request, reply) => {
  if (
    request.url.startsWith('/admin') ||
    request.url.startsWith('/app') ||
    request.url.startsWith('/groups') ||
    request.url.startsWith('/pastor') ||
    request.url.startsWith('/church') ||
    request.url === '/'
  ) {
    return reply.sendFile('index.html', adminDist);
  }
  return reply.status(404).send({ error: 'Not found' });
});
```

Keep `/pastor` and `/church` so old bookmarks that hit the host without hash still get the SPA (client `LegacyHashRedirect` only helps when a hash is present; bare `/pastor` can be a tiny client redirect later — optional: add routes `/pastor` → Navigate `/groups` in `AppRoutes`).

- [ ] **Step 2: Optional compat redirects in `router.tsx`**

```tsx
<Route path="/pastor" element={<Navigate to="/groups" replace />} />
<Route path="/church/:churchId" element={<Navigate to="/groups/:churchId" replace />} />
```

For `/church/:churchId` → `/groups/:churchId`, use a tiny component:

```tsx
function ChurchRedirect() {
  const { churchId } = useParams();
  return <Navigate to={churchId ? `/groups/${churchId}` : '/groups'} replace />;
}
```

- [ ] **Step 3: Document in plan completion notes** — Vite preview/dev already SPA-falls back; production hosts need the Fastify change (or nginx `try_files $uri /index.html`).

- [ ] **Step 4: Commit** (only if user asked)

---

### Task 8: Final verification

**Files:** none new

- [ ] **Step 1: Full admin test + build**

```bash
cd admin && npm test && npm run build
```

Expected: tests PASS; `tsc -b && vite build` succeeds.

- [ ] **Step 2: Manual checklist**

1. `npm run dev` → `/` shows landing  
2. `/app/dashboard` unauthed → `/app/login?next=...`  
3. Login → lands on `next` or overview  
4. Sidebar People → URL `/app/dashboard/people`, refresh keeps page  
5. `/app/dashboard/nope` → overview  
6. `/groups` pastor gateway  
7. Visit `/#/landing` → replaces with `/`  
8. Published weeks “Author” → `/app/dashboard/quests?week=N` opens editor  

- [ ] **Step 3: Mark spec status** — in `docs/superpowers/specs/2026-09-24-admin-path-routing-design.md`, set `Status: Implemented` only after manual checklist passes (optional doc edit).

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Path `/`, `/app/dashboard`, `/app/dashboard/:tab`, `/groups` | 2, 3 |
| Guest auth at `/app/login|forgot|reset` | 2, 5 |
| `RequireStaff` + `next` | 2, 5 |
| `RequireGuest` | 2 |
| Invalid `:tab` → overview; unknown → `/` | 2 |
| Landing not force-redirect when logged in | 2 (`/` public) |
| Replace hash router / call sites | 1, 4, 5 |
| Legacy hash redirect | 2 (`LegacyHashRedirect`), 6 |
| `MemoryRouter` tests | 2, 6 |
| SPA fallback | 7 |
| Quest `?week=` via search params | 5 |
| Out of scope (Flutter, API, UI redesign) | Not planned |

No TBD placeholders. Temporary `navigate` stub is explicitly removed in Task 5.
