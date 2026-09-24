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

