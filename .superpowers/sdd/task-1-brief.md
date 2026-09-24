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

