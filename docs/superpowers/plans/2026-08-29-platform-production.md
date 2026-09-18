# ASK Hub MVP Implementation Plan (PRD-complete)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved MVP in `prd.txt`, `PRD_2.txt`, and `PRD_TEEN_QUEST.txt` across `backend/`, `mobile/`, and `admin/` so Milestone 4 can submit Android to Play Store.

**Architecture:** One TypeScript Fastify API + PostgreSQL (system of record). Flutter is the family/teen/teacher/parent client with JWT. React admin is App Manager CMS plus teacher class tools. Same API, same ledger.

**Tech Stack:** Flutter + Provider + Dio; Fastify 5 + Prisma + Postgres; React 19 + Vite; Play AAB.

## Global Constraints

- Follow PRDs; Full Build items in `prd.txt` §11 stay out unless listed below as optional.
- No live classes, chat, AI, or iOS store (`prd.txt` §12).
- Scoring values must match `ACTIVITY_POINTS` in `backend/src/routes/engagement.routes.ts`.
- Deny-by-default visibility (`prd.txt` §6). Teachers never see private reflections.
- Teachers cannot author Teen Quest content (403); they only activate quizzes.
- Teens cannot submit Teen Quest quizzes unless `ClassQuizActivation.isActive`.
- Parents on class leaderboard: own teen unblurred, others blurred.
- Together Mode is parent-initiated only.
- Do not download YouTube; stream only.
- Do not commit `.env`, keystores, or secrets.
- Do not commit unless the user asks.
- Target SDK 36; package `com.elasctroclud.teen_aventure`; display name Teen Bible Adventures.

## File map (new / primary)

| Area | Create / modify |
|------|-----------------|
| Auth UI | `mobile/lib/screens/auth_gate.dart`, `login_screen.dart`, `register_family_screen.dart`, `child_pin_screen.dart`, `teen_login_screen.dart` |
| Hub UI | `mobile/lib/screens/growth_hub_screen.dart` plus marinade, prayers, devotionals, life_prayers, bible_reading screens |
| Teen Quest UI | `mobile/lib/screens/teen_quest_feed_screen.dart`, `active_quiz_status.dart`, wire `objective_quiz_screen.dart` + `puzzle_screen.dart` to API submit |
| Engagement UI | family jar, group jar, together (parent), nudge picker, score header from API |
| Safeguarding UI | parent report form |
| Church UI | join-code / leave church |
| Admin CMS | `admin/src` Teen Quest builder; teacher activate + leaderboard views |
| Account deletion | Profile → uses existing `POST /api/families/request-deletion` |
| Play | already scaffolded; keep `docs/play-store/` |

Existing clients to **use, not rewrite:** `mobile/lib/services/auth_service.dart`, `content_service.dart`, `engagement_service.dart`.

---

## Milestone 1 — Foundation (prd.txt §4.1–4.2)

**Already done (backend + tests):** register/login, child PIN, teen-login, families, guardians, churches, classes, enroll, join-code, leave church, roles.

### Task 1.1: Flutter auth gate

- [ ] Replace `HomeScreen` as unauthenticated root. `main.dart` home = `AuthGate` reading `ApiClient.isAuthenticated` / stored role.
- [ ] Screens: parent register+login; child PIN; teen independent login. Persist token via existing `ApiClient.setAuthToken`.
- [ ] Tests: widget test login form validation; mock Dio if needed.
- [ ] On success, load `HomeScreen` with **JWT role**, not `GameController.switchRole` in release (`StoreConfig.showDemoRoles` stays debug-only).

**Files:** `mobile/lib/screens/auth_*.dart`, `mobile/lib/main.dart`

### Task 1.2: Role home shells

- [ ] Parent: family children, join/leave church, start Together, send predefined nudge, view own teen leaderboard (blurred others), file safeguarding report.
- [ ] Teacher: assigned class, activate Teen Quest quiz, unblurred leaderboard (API).
- [ ] Teen/child: growth hub + teen quest + score.
- [ ] Remove production dependence on hamburger STUDENT/TEACHER/PARENT demo.

**Files:** `mobile/lib/screens/home_screen.dart` (split if > needed), new parent/teacher shells.

### Task 1.3: Account deletion (Play + PRD lifecycle)

- [ ] Profile action calls family deletion request API. Copy explains 0–30 / 30–90 / 90+ from `prd.txt` §7.
- [ ] Admin deletions tab already lists requests.

---

## Milestone 2 — Core ASK Hub / PRD 2

**Already done (backend):** marinade, prayer steps, devotionals+reflect, BIY weeks, life prayers, bible-reading complete/progress/books. **Already done (admin):** devotionals + BIY YouTube week form. **Already done (Flutter services):** `ContentService` methods. **Missing:** Flutter screens + remaining admin CMS.

### Task 2.1: Spiritual Growth Hub tab (PRD 2 §4.2)

- [ ] Bottom nav or hub tile: Marinade, Prayers, Devotionals, BIY, Life Prayers, Bible Reading (not “coming soon” snackbars for these).
- [ ] Journal tile can remain snackbar only if private reflection lives on the Devotional screen.

**Files:** `explorer_home_tab.dart`, `adventure_tools_grid.dart`, new `growth_hub_screen.dart`

### Task 2.2: Scripture Marinade screen

- [ ] `GET /api/hub/scripture-marinade/steps`; sequential steps; `POST /api/engagement/submit` type `SCRIPTURE_MARINADE`.
- [ ] Test: completing a step calls submit once.

### Task 2.3: Prayers of a Lifetime

- [ ] Steps including salvation step; submit `PRAYER_STEP` / `SALVATION_STEP`.
- [ ] Parent-only Together entry point (Task 3.3), not child-start.

### Task 2.4: Devotionals

- [ ] Day list/detail from API; private reflection `POST .../reflect`; submit `DEVOTIONAL` for 78 pts once.
- [ ] Teachers must not see reflection text (API already family-scoped).

### Task 2.5: Life & Living Prayers

- [ ] Categories + favorites (prefs if no favorite API); audio if `audioKey`/URL present; submit `LIFE_PRAYER`.
- [ ] Admin: POST life-prayers form (API exists). Skip R2 UI if no audio files yet.

### Task 2.6: Bible Reading tracker

- [ ] `GET .../books` progress bars; chapter complete `POST .../complete`.
- [ ] Test: one chapter complete increments count.

### Task 2.7: Admin CMS remainder (PRD 2 §4.3)

- [ ] Forms for marinade steps, prayer steps (API POSTs exist).
- [ ] BIY quiz JSON editor usable (not only `[]`).
- [ ] Defer “analytics dashboards” if needed (Full Build overlap).

---

## Milestone 3 — Bible, Teen Quest, Engagement (prd.txt §4.3–4.4 + PRD_TEEN_QUEST)

**Already done (backend):** teen-quest CRUD/activate/submit-objs/submit-scramble/leaderboard blur; engagement submit, streaks, jars, together, nudges; BIY video+quiz point types + weekly cap. **Already done (Flutter):** local parchment quiz, local scramble puzzle, YouTube player. **Missing:** wire to live activation + ledger; engagement UI; admin quest CMS; teacher activate.

### Task 3.1: BIY week in Flutter from API

- [ ] Student Bible tab uses `VideoProvider.biyWeeks` when `hasRemoteApi`, else sample.
- [ ] On video complete, `engagement/submit` `BIY_VIDEO` (20 pts) with week identity for cap.
- [ ] Weekly quiz uses week `quiz` JSON; submit `BIY_QUIZ` (50) — later add server-side grade if required for launch QA.
- [ ] Real YouTube URLs via admin or seed (operator).

### Task 3.2: Teen Quest live loop (PRD_TEEN_QUEST)

- [ ] Feed: `GET /api/teen-quest/weeks`.
- [ ] Status: `GET .../class/:classId/active`.
- [ ] OBJS: existing UI → `submit-objs` (not local-only).
- [ ] SCRAMBLE: puzzle UI → `submit-scramble`.
- [ ] Leaderboard: `GET .../leaderboard` (teen unblurred classmates; parent blur).
- [ ] Admin: `/admin/quests` builder (create/update/delete weeks) — APP_MANAGER only.
- [ ] Admin or in-app teacher: activate OBJS / SCRAMBLE / BOTH / deactivate.

**Files:** `admin/src` new views; `mobile/lib/screens/teen_quest_*.dart`; `content_service.dart` already has methods.

### Task 3.3: Score, streaks, jars, Together, nudges

- [ ] Header score/streak from `GET /api/engagement/score/:childId` (not hardcoded 120/5).
- [ ] Family jar UI from engagement family endpoint (fix `getFamilyJar` vs backend if mismatch).
- [ ] Group jar: match API `{ groupJarTotal, contributingFamilies }` — do not show family names/amounts (prd.txt §4.4).
- [ ] Parent starts Together; each child gets full credit on complete.
- [ ] Predefined nudge list only (no free text).

**Files:** `engagement_service.dart`, `engagement.routes.ts` (align jar GET if missing), new widgets.

### Task 3.4: Safeguarding report (prd.txt §4.5)

- [ ] Parent flow: submit + view own reports (`/api/safeguarding`).
- [ ] Anonymous option as API allows.
- [ ] Admin already lists/closes.

---

## Milestone 4 — QA, production, Play (prd.txt §9–10, §13)

**Already done:** Docker Compose Postgres, CORS env, seed APP_MANAGER, Play StoreConfig, legal screens, targetSdk 36, signing example, `docs/play-store/`, `docs/ops/runbook.md`.

### Task 4.1: Permission & isolation tests

- [ ] Extend `backend/tests/api.test.ts` if any §6 visibility case is missing (reflection leak, teacher content 403, leaderboard blur).
- [ ] Flutter widget tests for AuthGate and one hub screen.

### Task 4.2: Production deploy

- [ ] Hosted Postgres, TLS, `JWT_SECRET` ≥ 32, `CORS_ORIGINS`, `admin npm run build` served at `/admin/`.
- [ ] Backups (operator). PostgreSQL is the only datastore — do not add Redis.

### Task 4.3: Play submission

- [ ] YouTube URLs live.
- [ ] `flutter build appbundle --release --dart-define=API_BASE_URL=https://...`
- [ ] Console: listing, IARC, 13–17, Data safety, privacy URL, account deletion disclosure.
- [ ] Operator: `docs/play-store/console-checklist.md`

---

## Explicitly later (not this plan)

- Child-to-adult transition, advanced church analytics, jurisdiction consent packs (`prd.txt` §11).
- iOS App Store.
- FlutterDownloader FileProvider (not in PRD MVP).
- Hive offline cache (listed in Teen Quest PRD stack; optional if Secure Storage + API suffice).

---

## Verification (PRD_TEEN_QUEST §7 + prd.txt §10)

```bash
docker compose up -d
cd backend && npm test
cd admin && npm test
cd mobile && flutter test
cd admin && npm run build
cd backend && npm run build
```

Manual: parent register → add child PIN → teen login → complete marinade + BIY video/quiz → teacher activates objs → teen submits → parent sees blurred leaderboard → Play internal track AAB.
