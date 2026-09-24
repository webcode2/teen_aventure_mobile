# Task 4 Report: Shell + TopNav path navigation

## Status

**DONE** — `shell.tsx` and `top-nav.tsx` use `useNavigate` from `react-router` with URL paths. Legacy `navigate({ kind: ... })` from `./route` removed in these two files only.

## Commits

None (per instructions).

## Summary

- **shell.tsx:** Sidebar clicks call `navigate(id === 'dashboard' ? '/app/dashboard' : `/app/dashboard/${id}`)` after `closeMobileNav()`.
- **top-nav.tsx:** Notifications → `/app/dashboard/notifications`; New quest → `/app/dashboard/quests`; Sign out clears token then `navigate('/app/login')`.
- **Verification:** `npx tsc -b` in `admin/` exits 0. Full `npm run build` not re-run in sandbox (tsbuildinfo write under `node_modules/.tmp` hit EACCES in sandbox).

## Files changed

| File | Change |
|------|--------|
| `admin/src/shell.tsx` | `useNavigate`; path-based sidebar navigation |
| `admin/src/top-nav.tsx` | `useNavigate`; path-based header actions |

## Out of scope (Task 5)

Still using stub `navigate({ kind: ... })`: `auth-pages.tsx`, `pages-landing.tsx`, `pages-pastor.tsx`, `pages-ops.tsx`, `pages-content.tsx`, `pages-weeks.tsx`.

## Concerns

1. End-to-end sidebar/TopNav behavior needs a token + authed shell; login/sign-in pages still use old navigate until Task 5.
2. Manual dev sanity (`npm run dev`, click sidebar) not run in this session.

## Next

Task 5: migrate remaining pages to path navigation and wire auth flow to `/app/login`.
