# ASK Hub Teen — Fast Build IDOC

**Date:** 2026-08-29  
**Type:** Implementation document (status + remaining work)  
**Goal:** Ship a demoable teen loop in the shortest path: explorer home → YouTube lesson → quiz. Do not rebuild finished surfaces.

This is the source of truth for what is already in the repo versus what still blocks a fast build. Theme work from 2026-08-28 is complete and must not be re-done.

---

## Product in one sentence

A Flutter teen Bible app (student / teacher / parent demo roles) with a navy/cream adventure UI, backed by a Fastify + Postgres API and a thin admin dashboard.

## Success for this fast build

A reviewer can:

1. Launch Chrome debug (`Flutter Chrome` → http://localhost:7357) or Android.
2. See the explorer home (navy header, mascots, Today’s Quest, bottom nav).
3. Open a lesson and **play a real YouTube video**.
4. Open Quests and complete the parchment quiz (local sample is enough).

Anything not required for those four steps is **out of scope** for the fast build.

Play Store upload work is tracked separately in [2026-08-29-play-store-idoc-design.md](./2026-08-29-play-store-idoc-design.md) and `docs/play-store/console-checklist.md`.

---

## Architecture (as built)

```
mobile/   Flutter app (teen_aventure) — UI + local sample + partial API
backend/ Fastify 5 + Prisma/Postgres :8080 — auth, hub, teen-quest, engagement
admin/    React/Vite APP_MANAGER dashboard — devotionals + ops, not a lesson CMS
```

- Mobile launches straight to `HomeScreen`. No login screen.
- Student explorer + quiz use **local** `SampleEpisodes`. Teacher/parent week lists use **API** `VideoProvider.biyWeeks` (empty if backend is down).
- Video policy: stream YouTube in-app; optional MP4 download is separate and **not** required for the fast build.
- Flutter web is on **7357**; backend stays on **8080**. Do not put both on 8080.

---

## Done (do not rebuild)

### Theme and student chrome

Verified against `docs/superpowers/specs/2026-08-28-teen-bible-adventures-theme-design.md`.

| Item | Where |
|------|--------|
| Mockup palette + `TeenAppTheme` aliases | `mobile/lib/theme.dart` + `test/theme_tokens_test.dart` |
| Header, ribbon logo, navy bottom nav | `adventure_header.dart`, `adventure_logo.dart`, `adventure_bottom_nav.dart` |
| Explorer home (greeting, mascots, verse, quest, tools, streak) | `explorer_home_tab.dart` + widgets |
| Parchment objective quiz | `objective_quiz_screen.dart` |
| Role switcher in hamburger drawer | `home_screen.dart` |
| Journal / Friends tiles as “coming soon” snackbars | `explorer_home_tab.dart` (intentional) |

### Video architecture (player works; URLs empty)

| Item | Where |
|------|--------|
| YouTube vs MP4 parser; no in-app YouTube download | `mobile/lib/models/video_source.dart` + `test/video_source_test.dart` |
| Player routes YouTube embed vs `video_player` | `lesson_video_player.dart` |
| IO vs web embeds | `platform/youtube_embed*.dart` |
| Conditional file I/O (web-safe) | `platform/local_fs*.dart` |
| Download service skipped on web | `video_download_service.dart` |
| Android `INTERNET` on main manifest | `android/app/src/main/AndroidManifest.xml` |

### Chrome debug (blank-page fixes)

| Item | Where |
|------|--------|
| Launch from `mobile/`, Chrome, port 7357 | `.vscode/launch.json` (`Flutter Chrome`) |
| Web API host is `localhost:8080`, not `10.0.2.2` | `api_client.dart` |
| Bounded Dio retries; no retry storm on web | `api_client.dart` |
| `late VideoLesson` crash avoided | `home_screen.dart` defaults to sample week-1 |
| Profile `ListTile` wrapped in `Material` | `home_screen.dart` |
| Web splash so body is not 0-height white | `mobile/web/index.html` |

### Backend (API exists; content placeholders)

| Item | Where |
|------|--------|
| Auth, family, church, class, hub, engagement, teen-quest, admin, media | `backend/src/*.routes.ts` |
| BIY weeks + Teen Quest seed shape | `backend/prisma/seed.ts` (4 BIY weeks, 1 quest) |
| CORS open (`origin: true`) | Fastify cors plugin |
| Integration tests | `backend/tests/api.test.ts` |

### Admin (ops dashboard, not lesson CMS)

Login as `APP_MANAGER`, dashboard stats, churches (read), safeguarding close, devotionals create, deletions, scoring rules read. **No UI** to paste BIY YouTube URLs.

---

## Left to do — fast build only

Ordered. Stop after Wave 2 unless the demo must hit a live API.

### Wave 1 — Make video play (blocker)

Empty URLs are why the player shows “Add a YouTube link…”.

1. Paste real published YouTube watch URLs into `mobile/lib/data/youtube_lesson_urls.dart` (`week1Part1` at minimum; parts 2–3 if the week-1 package is used).
2. Replace seed placeholders in `backend/prisma/seed.ts`:
   - `YOUR_WEEK_1_ID` … `YOUR_WEEK_4_ID` must be real 11-character YouTube IDs.
3. Confirm playback: Home → Start Reading (or Bible tab) → player loads, not the empty-URL placeholder.

Do **not** scrape or download YouTube. Streaming watch/embed URLs only.

### Wave 2 — Demo loop without fighting the API

1. Keep student home/quiz on `SampleEpisodes` (already).
2. If teacher/parent week lists must look populated with backend down: fall back to `SampleEpisodes.weeklyVideoLessons` when `VideoProvider.biyWeeks` is empty. Skip this if the demo stays on student role.
3. Guardian lock: for a public demo, either leave the bible-tab demo unlock toggle or default `GameController.isGuardianUnlocked` to `true`. Do not build a real parent-sync API in this wave.
4. Run `flutter test` from `mobile/` after URL paste (parser + explorer + quiz tests already exist).

### Wave 3 — Live backend (optional)

Only if the demo must load weeks from Postgres.

1. Postgres on `localhost:5433` (see `backend/.env.example`).
2. `npx prisma migrate` + `prisma db seed` **after** Wave 1 seed URLs are real.
3. Set one user `platformRole = APP_MANAGER` in DB if admin login is needed (no bootstrap endpoint exists).
4. Flutter already calls `http://localhost:8080` on web. Keep Flutter Chrome on **7357**.

Do not implement `GET /api/engagement/family/jar` or reshape `group-jar` for this wave — `EngagementService` is unused by screens.

---

## Explicitly out of fast build

Do not start these unless the demo definition changes.

| Item | Why skip |
|------|----------|
| Journal / Friends backends | Spec already snackbar-only |
| Pixel-perfect teacher/parent/leaderboard restyle | Tokens applied; layout rebuild is polish |
| Android `FileProvider` + `flutter_downloader` native wiring | Offline is optional; stream YouTube instead |
| iOS background download | Same |
| Auth UI (parent / teen login) | `AuthService` exists; app skips login |
| BIY quiz server grading | Points today via unvalidated `engagement/submit`; local quiz UI is enough |
| Admin CMS for BIY / Teen Quest | Paste URLs in seed + dart constants |
| R2 media uploads | YouTube path does not need R2 |
| Web YouTube `onEnded` / seek sync | Needed only if quiz unlock must follow watch time on Chrome |
| `hive` unused dependency cleanup | Not a demo blocker |

---

## Known mismatches (do not treat as “start over”)

- Student interactive flows = sample data. Teacher/parent lists = API. Mixed by design until Wave 2 fallback.
- Teen Quest submit needs class + teacher activation. Fast-build quiz is the **local** `ObjectiveQuizScreen`, not live Teen Quest.
- Bell badge is hardcoded “3 alerts”. Fine for demo.
- Leaderboard / roster use hardcoded names. Fine for demo.
- Repo is **not** a git repository at workspace root (no `.git`). Specs cannot be committed until git is initialized.

---

## Fast-build file map (only files that should change)

Wave 1:

- Modify: `mobile/lib/data/youtube_lesson_urls.dart`
- Modify: `backend/prisma/seed.ts` (videoUrl strings only)

Wave 2 (only if needed):

- Modify: `mobile/lib/screens/home_screen.dart` — sample fallback and/or guardian default
- Modify: `mobile/lib/models/game_controller.dart` — `isGuardianUnlocked` default if chosen

Wave 3 (ops, not feature code):

- `backend/.env`
- Docker Postgres + migrate + seed

---

## Verification checklist

- [ ] Chrome: `Flutter Chrome` launch config; URL **http://localhost:7357**
- [ ] Explorer home visible (not blank white, not empty-URL player as the first screen)
- [ ] Week 1 part 1 YouTube plays
- [ ] Quests tab: answer Q1, see Correct + Next Question
- [ ] `flutter test` from `mobile/` passes
- [ ] (Wave 3 only) `GET http://localhost:8080/api/health` and `GET /api/hub/biy/weeks` return real `videoUrl`s

---

## Approach chosen

**Content-first, not CMS-first, not auth-first.** The player and quiz already exist. The only hard blocker is empty/placeholder YouTube IDs. Building admin lesson editors or login screens before URLs are pasted delays the demo without changing the user-visible loop.
