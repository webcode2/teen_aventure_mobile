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

