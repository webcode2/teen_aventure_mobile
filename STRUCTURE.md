# TBA Puzzle Studio — Pre-build Structure Audit

**Date:** 2026-09-22  
**Scope:** Read-only audit. No Puzzle Studio feature code was written.  
**Monorepo root:** `/home/bash/Desktop/ASKADONAI/ask_teens_app`

---

## Critical correction (replace Next.js assumptions)

| Assumption in later prompts | Actual reality |
|-----------------------------|----------------|
| Next.js App Router / Pages Router | **Neither.** Admin is **Vite 8 + React 19 + TypeScript** SPA |
| `app/(studio)/…` route group | **Does not exist.** Use admin **hash tab** + `pages-*.tsx` |
| Next.js Server Actions / Route Handlers | **No.** Content API is **Fastify** under `backend/` |
| Supabase / Firebase Auth as BAAS | **No.** Auth is **JWT Bearer** + Prisma/Postgres. Firebase Admin is **push (FCM) only** |

Use the **placeholder map** at the bottom of this file in every later prompt.

---

## Repo map

```
ask_teens_app/                          # git root (no root package.json, no pnpm/npm workspaces)
├── admin/                              # Vite + React staff dashboard (AskHub admin)
│   ├── src/
│   │   ├── App.tsx                     # hash route → page map + Shell
│   │   ├── route.ts                    # custom hash router (not React Router)
│   │   ├── api.ts                      # fetch + Bearer JWT (localStorage)
│   │   ├── shell.tsx / top-nav.tsx / ui.tsx
│   │   ├── auth-pages.tsx
│   │   ├── pages-ops.tsx               # dashboard, churches, reports, deletions, scoring
│   │   ├── pages-people.tsx            # people directory / CRUD
│   │   ├── pages-content.tsx           # QuestsPage (Teen Quest authoring)
│   │   ├── pages-notify.tsx            # notifications, consent
│   │   └── App.test.tsx
│   ├── vite.config.ts                  # vitest jsdom
│   └── package.json                    # name: "admin"
├── backend/                            # Fastify 5 API (askhub-backend)
│   ├── src/
│   │   ├── index.ts                    # registers all route prefixes
│   │   ├── plugins/auth.ts             # JWT guards
│   │   ├── lib/                        # prisma, storage (R2), scoring, admin-roles, …
│   │   ├── routes/                     # *.routes.ts REST plugins
│   │   └── workers/lifecycle.worker.ts
│   ├── prisma/
│   │   ├── schema.prisma               # PostgreSQL models
│   │   ├── data/teen-bible-adventures-52.json
│   │   └── migrations/
│   ├── tests/                          # vitest + supertest
│   └── vitest.config.ts                # no coverage block
├── mobile_/                            # Flutter teen app (package: teen_aventure)
│   ├── lib/
│   │   ├── services/content_service.dart   # Dio → /api/teen-quest/*
│   │   ├── models/api_models.dart          # TeenQuest + quiz/scramble JSON
│   │   ├── models/puzzle.dart              # Crossword PuzzleEpisode (local only)
│   │   ├── data/episodes.dart              # SampleEpisodes (hardcoded)
│   │   └── screens/teen/…
│   └── test/                           # 4 widget/unit tests; no content fixtures
├── docs/                               # legal, ops, play-store, superpowers
└── STRUCTURE.md                        # this file
```

**No** `.github/workflows` at repo root. **No** Next.js (`next.config.*` absent). **No** shared `packages/` workspace.

---

## 1. Admin “app” structure (Vite SPA, not Next.js)

### Router
- **Custom hash router** — `admin/src/route.ts`
- Tabs: `dashboard | people | churches | quests | notifications | consent | reports | deletions | scoring`
- URLs: `#/login`, `#/quests`, etc. (`navigate()` + `askhub:route` event)
- Wired in `admin/src/App.tsx`

### Where admin screens live

| File | Feature |
|------|---------|
| `admin/src/pages-ops.tsx` | Overview, Churches, Reports, Deletions, Scoring |
| `admin/src/pages-people.tsx` | People / users / families |
| `admin/src/pages-content.tsx` | **`QuestsPage`** — Teen Quest week CRUD (objs + scramble JSON) |
| `admin/src/pages-notify.tsx` | Notifications, Consent packs |
| `admin/src/auth-pages.tsx` | Login / forgot / reset |

Closest existing “studio”: **`#/quests`** → `QuestsPage`.

### State management
- **Local `useState` / `useEffect` only**
- Auth token/user: module state + `localStorage` in `admin/src/api.ts` (`askhub_admin_token`, `askhub_admin_user`)
- No Redux, Zustand, React Query, or Context providers for app state

### Component conventions
- `pages-*.tsx` — feature screens (own fetching)
- `ui.tsx` — shared presentational primitives
- `shell.tsx` — sidebar layout (Operate / Publish / Care)
- `api.ts` — thin `fetch` client; `API_BASE = VITE_API_BASE` (local default `http://127.0.0.1:8080`)
- Auth header: `authorization: Bearer <jwt>` (not cookies)

### Dashboard login gate
Roles allowed in admin UI: `APP_MANAGER | SUPER_ADMIN | SUPER_EDITOR | EDITOR` (`DASHBOARD_ROLES` in `api.ts`).

---

## 2. Backend reality

### Stack
| Layer | Choice |
|-------|--------|
| HTTP | **Fastify 5** — `backend/src/index.ts` |
| Validation | **Zod** on route bodies |
| DB | **Prisma** → **PostgreSQL** |
| Auth | **JWT** (`jsonwebtoken`) via `backend/src/plugins/auth.ts` |
| Media | **Cloudflare R2** (S3 API) — `backend/src/lib/storage.ts` |
| Push | **Firebase Admin** (FCM only) — not login |
| Email | Resend (password reset / notify) |

**Not used:** Next server actions, Supabase client, Firebase Auth, GraphQL, tRPC.

### Route prefixes

| Prefix | File |
|--------|------|
| `/api/auth` | `backend/src/routes/auth.routes.ts` |
| `/api/families` | `family.routes.ts` |
| `/api/churches` | `church.routes.ts` |
| `/api/classes` | `class.routes.ts` |
| `/api/engagement` | `engagement.routes.ts` |
| `/api/media` | `media.routes.ts` |
| `/api/admin` | `admin.routes.ts` |
| `/api/teen-quest` | `teen-quest.routes.ts` |
| `/api/consent` | `consent.routes.ts` |
| `/api` (invites) | `invite.routes.ts` |
| `/api/health` | `index.ts` |

### Content upload today
- **Endpoint:** `POST /api/media/upload` — `requireAdminLevel(2)`
- **Mechanism:** multipart (`@fastify/multipart`, 25 MB) → buffer → R2 key `content/<fieldname>/<uuid>-<filename>`
- **Read:** `POST /api/media/read-url` — presigned GET (1h), `requireAuth`
- **Admin Quests UI does not call `/api/media`** — saves JSON only to `/api/teen-quest/admin/weeks` (video URLs would be pasted if used)

### Auth + roles
- Guards: `requireAuth`, `requireUser`, `requireParent`, `requireChild`, `requireChurchRole`, `requireAppManager`, `requireAdminLevel(n)`
- Levels (`backend/src/lib/admin-roles.ts`):
  - **3** `APP_MANAGER` / `SUPER_ADMIN` — operate
  - **2** `SUPER_EDITOR` — publish, quests, media upload
  - **1** `EDITOR` — limited / stats
- Prisma `PlatformRole`: `MAIN_ACCOUNT | CHILD | APP_MANAGER | EDITOR | SUPER_EDITOR | SUPER_ADMIN`
- Teen Quest admin CRUD: **`requireAdminLevel(2)`**

### Teen Quest APIs (content surface for Studio)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/teen-quest/weeks` | List — **no** quiz fields |
| GET | `/api/teen-quest/weeks/:weekNumber` | Full row incl. `objectiveQuiz`, `scrambleQuiz` |
| POST | `/api/teen-quest/admin/weeks` | Upsert (level ≥ 2) |
| PUT | `/api/teen-quest/admin/weeks/:id` | Partial update |
| DELETE | `/api/teen-quest/admin/weeks/:id` | Delete |
| POST | `/api/teen-quest/class/:classId/activate` | Class owner |
| GET | `/api/teen-quest/class/:classId/active` | Active activations |
| POST | `/api/teen-quest/submit-objs` | Server-graded |
| POST | `/api/teen-quest/submit-scramble` | *(REMOVED by user request — see .agents/rules/REMOVED_FEATURES.md)* |

---

## 3. Database

- **ORM:** Prisma (`backend/prisma/schema.prisma`)
- **Access:** `backend/src/lib/prisma.ts` → `@prisma/client`
- **Engine:** PostgreSQL (`DATABASE_URL`)

### Content-relevant models
| Model | Role |
|-------|------|
| `TeenQuest` | Week content; `videos` / `objectiveQuiz` (scrambleQuiz deprecated & defaulted to `[]`) |
| `ClassQuizActivation` | Per-class OBJS |
| `ScoringRule`, `ScoreLedger` | Points; activities include `TEEN_QUEST_OBJS` (TEEN_QUEST_SCRAMBLE retired) |

### Puzzle table?
**None.** Crossword / TBA “puzzle” in the Flutter app is **client-local** (`PuzzleEpisode`). Note: Word Scramble was permanently removed from the platform. Dedicated puzzle authoring belongs to **Puzzle Studio** (`CHAIN`, `CROSSWORD`, `MATCHING`).

Seed toolkit (Google Forms links, not app quiz schema):  
`backend/prisma/data/teen-bible-adventures-52.json`

---

## 4. Test setup

| Package | Runner | Config | Coverage |
|---------|--------|--------|----------|
| `backend/` | **Vitest** + supertest | `backend/vitest.config.ts` | **None configured** |
| `admin/` | **Vitest** + Testing Library (jsdom) | `admin/vite.config.ts` | **None configured** |
| `mobile_/` | **`flutter test`** | `analysis_options.yaml` | No coverage gate |

**Backend tests:** `backend/tests/{api,class-messages,config,family-rules-sync,memberships,notify,scoring}.test.ts` (+ `helpers.ts`, `setup.ts`). Teen Quest covered in `api.test.ts`.

**Admin tests:** `admin/src/App.test.tsx` (smoke).

**CI:** **No** repo-root `.github/workflows`. Coverage thresholds: **none**.

**Playwright / Jest:** not present (except Testing Library’s jest-dom matchers in admin).

---

## 5. Flutter teen app

### Location
**Same monorepo:** `mobile_/`  
Pubspec name: **`teen_aventure`**  
Siblings: `admin/`, `backend/`, `docs/`.

### How puzzle / quest content is fetched

**API client:** Dio — `mobile_/lib/services/api_client.dart`  
**Content facade:** `mobile_/lib/services/content_service.dart`

| Method | Endpoint |
|--------|----------|
| `getTeenQuestWeeks()` | `GET /api/teen-quest/weeks` |
| `getTeenQuestWeek(n)` | `GET /api/teen-quest/weeks/$n` *(defined; barely used by UI)* |
| `getActiveQuizzesForClass` | `GET /api/teen-quest/class/$classId/active` |
| `submitObjectiveQuiz` | `POST /api/teen-quest/submit-objs` *(defined; unused by UI)* |
| `submitScrambleQuiz` | `POST /api/teen-quest/submit-scramble` *(defined; unused by UI)* |

**Demo path:** `DemoAccount.demoWeeks()` when demo session.  
**Crossword:** always local `SampleEpisodes` / `PuzzleEngine` — **never API-fetched**.

Base URL: `StoreConfig.apiBaseUrl` / debug `http://10.0.2.2:8080` (Android) or `http://127.0.0.1:8080` (web).

### Current response JSON shapes

#### A. List weeks (`GET /api/teen-quest/weeks`) — quizzes omitted

```json
[
  {
    "id": "<uuid>",
    "weekNumber": 1,
    "title": "Strength in Weaker Vessels",
    "scripture": "…",
    "content": "…",
    "videos": [],
    "createdAt": "2026-…"
  }
]
```

#### B. Week detail (`GET /api/teen-quest/weeks/:weekNumber`) — full Prisma row

When quizzes are populated (shape from Zod + API test / client models):

```json
{
  "id": "<uuid>",
  "weekNumber": 99,
  "title": "Temporary Quest",
  "scripture": "Psalm 23",
  "content": "The Lord is my shepherd.",
  "videos": [],
  "objectiveQuiz": [
    {
      "id": "q99",
      "question": "Who is shepherd?",
      "options": ["God", "Man"],
      "answerIndex": 0,
      "points": 10
    }
  ],
  "scrambleQuiz": [
    {
      "id": "s99",
      "hint": "Provider",
      "scrambledWord": "ODG",
      "targetWord": "GOD",
      "points": 10
    }
  ],
  "createdAt": "2026-…"
}
```

Seeded production weeks often ship **`objectiveQuiz: []` / `scrambleQuiz: []`**; Forms links live in toolkit JSON / content text, not these fields.

#### C. Demo client shape (Dart → equivalent JSON)

From `mobile_/lib/config/demo_account.dart` `demoWeeks()`:

```json
{
  "id": "<demoQuestId>",
  "weekNumber": 1,
  "title": "Courage",
  "scripture": "Joshua 1:9",
  "content": "Be strong and courageous.",
  "objectiveQuiz": [
    {
      "id": "vq1",
      "question": "Who was the prophetess and judge who held court under a palm tree in Ephraim?",
      "options": ["Esther", "Deborah", "Ruth", "Miriam"],
      "answerIndex": 1,
      "points": 40
    }
  ],
  "scrambleQuiz": [
    {
      "id": "s1",
      "hint": "The opposite of fear when God is with you",
      "scrambledWord": "UROCAEG",
      "targetWord": "COURAGE",
      "points": 10
    }
  ],
  "biblePortions": [],
  "videos": []
}
```

(`biblePortions` is a **client-only** extension; not on Prisma `TeenQuest`.)

#### D. Crossword — no API JSON

Local recipe in `mobile_/lib/data/episodes.dart` / `models/puzzle.dart` (`PuzzleEpisode`, `PWord`). No backend contract today.

---

## Recommended paths for TBA Puzzle Studio

### A. TypeScript core — `lib/puzzles/`

**Recommended:** `backend/src/lib/puzzles/`

```
backend/src/lib/puzzles/
  ├── schema.ts          # Zod (canonical runtime validation)
  ├── types.ts           # inferred types
  ├── validate.ts        # pure validate/normalize
  └── index.ts
```

Why here: admin and backend are **separate packages** (no workspace). Fastify already owns Zod + Prisma; Studio save/publish should validate on the server. Admin can import via a thin duplicated type file later, or add a real `packages/puzzles` workspace only if sharing becomes painful.

**Do not** invent `admin/lib/puzzles` as the source of truth.

### B. Studio “route group” (Vite admin equivalent)

There is no App Router. Map “`(studio)` route group” → **hash tab + page module**:

| Next.js prompt term | Use instead |
|---------------------|-------------|
| `app/(studio)/puzzles/page.tsx` | `admin/src/pages-puzzles.tsx` (+ export `PuzzlesStudioPage`) |
| Route group `(studio)` | New tab in `admin/src/route.ts` `TABS` e.g. **`puzzles`** |
| URL | `#/puzzles` |
| Wire-up | `admin/src/App.tsx` page map + `shell.tsx` / `nav-icons.tsx` under Publish |

Keep quest authoring at `#/quests`; put crossword / multi-type Studio at `#/puzzles` (or `#/studio` if you prefer one umbrella tab).

### C. Contracts + fixtures

**Recommended (repo root, language-neutral):**

```
contracts/
  ├── puzzle.schema.json       # optional JSON Schema mirror of Zod
  ├── fixtures/
  │   ├── week-detail.populated.json
  │   ├── scramble-item.json
  │   ├── crossword-episode.v1.json   # NEW — for Studio ↔ Flutter
  │   └── MANIFEST.json               # { "files": { "path": "sha256:…" } }
  └── README.md
```

Backend tests can load: `../contracts/fixtures/…` from `backend/tests/`.  
Admin vitest can load the same via `fs` relative to monorepo root.

### D. Dart tests ↔ fixtures: relative path vs vendored copy

| Option | Feasible? | Notes |
|--------|-----------|-------|
| `File('../contracts/fixtures/…')` from `mobile_/test` | **Yes, locally** when CWD is `mobile_/` | Fragile if CI runs Flutter package alone / different CWD |
| `rootBundle` / pubspec `assets:` | Only if files live **under** `mobile_/` | Cannot point outside package without path dependency |
| **Vendored copy + MANIFEST hash** | **Recommended** | `mobile_/test/fixtures/` synced from `contracts/fixtures/`; test asserts hashes match `contracts/fixtures/MANIFEST.json` |

**Decision for later prompts:**

> Dart tests **must not** rely on sibling relative paths as the only mechanism.  
> Use **vendored copy** under `mobile_/test/fixtures/` **plus** a **MANIFEST sha256 check** against `contracts/fixtures/MANIFEST.json`.  
> Optional: a small `scripts/sync-puzzle-fixtures.sh` (or npm/dart script) to copy + rewrite MANIFEST.

---

## Placeholder replacement map (for later prompts)

Replace every `[PLACEHOLDER]` with these concrete values:

| Placeholder | Replacement |
|-------------|-------------|
| `[NEXT_APP_ROOT]` | **N/A — no Next.js.** Use `admin/` |
| `[APP_ROUTER_OR_PAGES]` | **Neither** — Vite SPA + hash router (`admin/src/route.ts`) |
| `[STUDIO_ROUTE_GROUP]` | Hash tab `puzzles` → `admin/src/pages-puzzles.tsx` (`#/puzzles`) |
| `[ADMIN_FEATURES_DIR]` | `admin/src/pages-*.tsx` (content: `pages-content.tsx`) |
| `[STATE_MGMT]` | Local `useState` / `useEffect` + `api.ts` localStorage JWT |
| `[API_LAYER]` | Fastify REST `backend/src/routes/*.routes.ts` |
| `[SERVER_ACTIONS]` | **None** — use Fastify routes |
| `[BAAS]` | **None** — Prisma + R2; Firebase = FCM only |
| `[CONTENT_UPLOAD]` | `POST /api/media/upload` → Cloudflare R2 (`backend/src/routes/media.routes.ts`) |
| `[AUTH]` | JWT Bearer (`backend/src/plugins/auth.ts`) |
| `[ROLES]` | `PlatformRole` + `requireAdminLevel`; Studio write = **level ≥ 2** (`SUPER_EDITOR`+) |
| `[DB]` | PostgreSQL via Prisma (`backend/prisma/schema.prisma`) |
| `[ORM]` | Prisma (`backend/src/lib/prisma.ts`) |
| `[EXISTING_CONTENT_MODEL]` | `TeenQuest` JSON: `objectiveQuiz`, `scrambleQuiz`, `videos` |
| `[PUZZLE_TABLE]` | **Does not exist** — add only if Studio needs first-class storage |
| `[TS_PUZZLE_CORE]` | `backend/src/lib/puzzles/` |
| `[CONTRACTS_DIR]` | `contracts/` (repo root) |
| `[FIXTURES_DIR]` | `contracts/fixtures/` |
| `[DART_FIXTURE_STRATEGY]` | Vendored `mobile_/test/fixtures/` + MANIFEST hash vs `contracts/fixtures/MANIFEST.json` |
| `[FLUTTER_APP]` | `mobile_/` (`package:teen_aventure`) |
| `[FLUTTER_CONTENT_SERVICE]` | `mobile_/lib/services/content_service.dart` |
| `[FLUTTER_QUEST_MODEL]` | `mobile_/lib/models/api_models.dart` → `TeenQuest` |
| `[FLUTTER_CROSSWORD_MODEL]` | `mobile_/lib/models/puzzle.dart` → `PuzzleEpisode` (local only) |
| `[TEEN_QUEST_LIST_ENDPOINT]` | `GET /api/teen-quest/weeks` |
| `[TEEN_QUEST_DETAIL_ENDPOINT]` | `GET /api/teen-quest/weeks/:weekNumber` |
| `[TEEN_QUEST_ADMIN_UPSERT]` | `POST /api/teen-quest/admin/weeks` |
| `[TEST_RUNNER_TS]` | Vitest (backend + admin) |
| `[TEST_RUNNER_DART]` | `flutter test` |
| `[CI_PIPELINE]` | **None at repo root** — add `.github/workflows/` when Studio lands |
| `[COVERAGE]` | Not configured — decide thresholds when adding Studio tests |

---

## Implications for Studio build order (facts only)

1. Reuse **admin SPA + Fastify + Prisma**; do not scaffold Next.js unless product explicitly migrates.
2. Closest authoring UI: **`QuestsPage`** / `#/quests`; Studio should be a **sibling tab**, not a Next route group.
3. Media pipeline exists but is **unused by admin UI** — wire Studio assets to `/api/media` if needed.
4. Crossword content has **no server contract** yet; invent `crossword-episode.v1` under `contracts/` before Flutter consumes Studio output.
5. Cross-language safety: **`contracts/fixtures` + MANIFEST + Dart vendored copy**.
)
