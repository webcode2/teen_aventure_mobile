# Task 3 Report: Wire `main.tsx` / `App.tsx`

## Status

**Complete.** Admin bootstrapping now uses React Router’s History API via `BrowserRouter` at the entry point; routing UI is delegated to `AppRoutes` from Task 2.

## Commits

None (per task constraints).

## Changes

### `admin/src/App.tsx`

Replaced the legacy hash-router implementation (~64 lines: `parseHash`, `hashchange` / `askhub:route` listeners, manual page switch) with a thin shell:

- Imports `AppRoutes` from `./router`
- Keeps `./studio/studio.css` (same as before)
- Renders `<AppRoutes />` only

No remaining references to `./route` `parseHash` / `Route` in `App.tsx`.

### `admin/src/main.tsx`

- Added `BrowserRouter` from `react-router` (no `basename`, per v1 design)
- Renders `LegacyHashRedirect` from `./guards` as a sibling before `<App />`, both inside `BrowserRouter`
- Preserved `StrictMode`, `./index.css`, and `createRoot` structure

**Mount order:** `StrictMode` → `BrowserRouter` → `LegacyHashRedirect` + `App` (`AppRoutes`).

## Interfaces consumed

| Symbol | Source | Role |
|--------|--------|------|
| `AppRoutes` | `./router` | Declarative route tree (Task 2) |
| `LegacyHashRedirect` | `./guards` | One-shot hash → path migration on load |
| `BrowserRouter` | `react-router` | History API routing context |

## Verification

```bash
cd admin && npx tsc -b --pretty false 2>&1 | head -40
```

**Result:** Exit code **0**, no TypeScript errors.

**Note:** First run in a restricted sandbox failed to write `node_modules/.tmp/*.tsbuildinfo` (`EACCES`) and briefly reported stale errors tied to the old `App.tsx` content. Re-run with normal filesystem access succeeded cleanly against the updated files.

No automated test suite was run for this task (brief only specified `tsc -b`).

## Out of scope (unchanged)

- Shell / pages `navigate` call sites (Tasks 4–5)
- Vite `base` / `BrowserRouter` `basename` for `/admin/` deploy prefix
- Git commit

## Concerns / follow-ups

1. **Legacy hash URLs:** `LegacyHashRedirect` runs once on mount; deep links that only update hash after navigation may still need Task 4–5 `navigate` migration or additional hash listeners elsewhere until call sites move off hash routing.
2. **`studio.css`:** Still imported in `App.tsx` only; if studio routes lazy-load later, confirm CSS load order remains correct.
3. **Production base path:** If the app is served under a subpath, coordinate Vite `base` and `basename` together (called out in brief as future work).

## Files touched

- `admin/src/App.tsx` (modified)
- `admin/src/main.tsx` (modified)
