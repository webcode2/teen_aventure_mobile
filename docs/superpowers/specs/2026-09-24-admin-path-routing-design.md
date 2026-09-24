# Admin path routing (React Router, guarded)

**Date:** 2026-09-24  
**Status:** Implemented (automated verification 2026-09-24; manual browser checklist unverified)  
**Scope:** `admin/` Vite SPA only (not mobile Flutter, not backend API paths)

## Goal

Replace the hash router (`#/landing`, `#/dashboard`, …) with path-based React Router URLs:

- `/` — public landing
- `/app/dashboard` and nested `/app/dashboard/:tab` — protected staff admin
- `/groups` and `/groups/:churchId` — church/pastor operations

## Decisions

| Decision | Choice |
|----------|--------|
| URL style | Path-based History API |
| Router | `react-router` (BrowserRouter) |
| Admin tabs | Nested under `/app/dashboard/:tab` |
| Auth for staff | `/app/login`, `/app/forgot`, `/app/reset` |
| Pastor/church | `/groups`, `/groups/:churchId` |
| Landing when logged in | Stay public; do not force-redirect to dashboard |

## Route map

| Path | Guard | Screen |
|------|-------|--------|
| `/` | Public | `PublicLandingPage` |
| `/app/login` | Guest-only | `LoginPage` |
| `/app/forgot` | Guest-only | `ForgotPage` |
| `/app/reset` | Guest-only | `ResetPage` (token via query `?token=`) |
| `/app/dashboard` | Staff JWT (`getToken()`) | `OverviewPage` in `Shell` |
| `/app/dashboard/:tab` | Staff JWT | Tab page in `Shell`. `:tab` must be in `TABS` **except** `dashboard` (overview is only the index route). |
| `/groups` | Pastor portal session (existing pastor auth) | `PastorPortalPage` |
| `/groups/:churchId` | Pastor portal session | `PastorPortalPage` with church id |

**Invalid `:tab`:** redirect to `/app/dashboard`.

**Unknown paths:** redirect to `/` (public) or a small not-found that links home — prefer redirect to `/`.

## Guards

### `RequireStaff`
- If no staff token → `Navigate` to `/app/login` with `next` search param set to the attempted path (including search).
- After successful login → navigate to `next` if it is a safe in-app path under `/app/dashboard`, else `/app/dashboard`.

### `RequireGuest`
- If staff token present on `/app/login|forgot|reset` → `Navigate` to `/app/dashboard`.

### Pastor area
- Keep current pastor portal sign-in behavior; only change URLs from `#/pastor` / `#/church/:id` to `/groups` / `/groups/:churchId`.
- Unauthed pastor views stay on `/groups` (login UI in portal), not staff `/app/login`.

## Architecture

```
BrowserRouter
├── /                     PublicLandingPage
├── /app
│   ├── login|forgot|reset   RequireGuest → auth pages
│   └── dashboard            RequireStaff → Shell layout
│       ├── index            OverviewPage
│       └── :tab             Tab page from map
└── /groups
    ├── index                PastorPortalPage
    └── :churchId            PastorPortalPage
```

### Replace
- `parseHash` / `hashFor` / `navigate()` in `admin/src/route.ts` (and call sites) with React Router `Link`, `useNavigate`, `useParams`, `useSearchParams`.
- `App.tsx` hash listeners → `<Routes>`.
- Shell/top-nav/sidebar tab clicks → `navigate(/app/dashboard/${tab})` or `/app/dashboard` for overview.

### Keep
- Existing page components and `Shell` composition.
- Token storage via `getToken()` / current auth API.
- Tab id list in `TABS` as the allowlist for `:tab`.

### Deploy / Vite
- Ensure SPA fallback: all non-file paths serve `index.html` (Vite preview and production host).
- Document any static-host rewrite needed (e.g. Netlify/nginx `try_files`).

## Compatibility

On first load, if `window.location.hash` matches an old route, replace with the new path once:

| Old hash | New path |
|----------|----------|
| `#/landing`, `#/home`, `#/public`, empty public intent | `/` |
| `#/login` | `/app/login` |
| `#/forgot` | `/app/forgot` |
| `#/reset?token=` | `/app/reset?token=` |
| `#/dashboard` or `#/<tab>` (authed tabs) | `/app/dashboard` or `/app/dashboard/<tab>` |
| `#/pastor` | `/groups` |
| `#/church/:id` | `/groups/:id` |

## Testing

Update `admin/src/App.test.tsx` (and any route unit tests) to use `MemoryRouter` / `createMemoryRouter` instead of setting `window.location.hash`.

Cover at least:
1. Landing renders at `/`
2. Unauthed `/app/dashboard` → login with `next`
3. Authed `/app/dashboard/people` renders People in Shell
4. Invalid tab → `/app/dashboard`
5. Pastor portal at `/groups`
6. One legacy hash redirect case

## Out of scope

- Flutter mobile routing
- Backend REST URL changes
- Redesign of landing or dashboard UI
- Role-based per-tab permissions beyond current Shell behavior

## Success criteria

- Bookmarkable `/` and `/app/dashboard/...` work with refresh.
- Staff dashboard is not reachable without a token.
- Pastor flows live under `/groups`.
- Old hash bookmarks still land on the correct path.
