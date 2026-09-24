# Task 1 Report: Install react-router + path helpers (TDD)

## Status

**DONE**

## Commits

None (per user instruction).

## Test summary

`npm test -- src/path-helpers.test.ts` — **3 passed** (isDashboardTab, safeStaffNext, legacyHashToPath).

## TDD Evidence

### RED (Step 3)

```
 FAIL  src/path-helpers.test.ts [ src/path-helpers.test.ts ]
Error: Failed to resolve import "./path-helpers" from "src/path-helpers.test.ts". Does the file exist?
```

### GREEN (Step 5)

```
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

## Changes

| File | Action |
|------|--------|
| `admin/package.json` | Added `react-router@^8.4.0` via `npm install react-router@^8` |
| `admin/package-lock.json` | Updated by npm |
| `admin/src/path-helpers.ts` | Created — `DASHBOARD_TAB_IDS`, `isDashboardTab`, `safeStaffNext`, `legacyHashToPath` |
| `admin/src/path-helpers.test.ts` | Created — verbatim from brief |
| `admin/src/route.ts` | Slimmed to `TABS`, `Tab`, deprecated `navigate()` stub |

## Removed from `route.ts` (intentional)

- `AuthView`, `Route`, `parseHash`, `hashFor`, hash-based `navigate` implementation

## Self-review

- Helper logic matches brief verbatim; imports `TABS` / `Tab` from slim `route.ts`.
- `legacyHashToPath` covers landing/auth/dashboard tabs, pastor/church → `/groups`, unknown tab → `/app/dashboard`, empty hash → `null`.
- `safeStaffNext` rejects non-path, protocol-relative (`//`), and paths outside `/app/dashboard`.
- `navigate` stub preserves import compatibility for call sites until Task 5; throws at runtime if invoked.

## Concerns

1. **`App.tsx` still imports `parseHash` and `Route`** — `tsc -b` / full admin build will fail until a later migration task restores or replaces those symbols. Focused helper tests are green; this is expected per task scope.
2. **`navigate` stub** — existing pages still compile against the export but will throw if executed before Task 5 migrates call sites to `useNavigate`.

## Out of scope (not touched)

- Flutter, backend, call-site migrations (Tasks 3–5).
- Word Scramble / scrambleQuiz (permanent removal).

## Report path

`/home/bash/Desktop/ASKADONAI/ask_teens_app/.superpowers/sdd/task-1-report.md`
