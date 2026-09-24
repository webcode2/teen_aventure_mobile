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

