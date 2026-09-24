# ASK Hub Teen — Platform Production IDOC

**Date:** 2026-08-29  
**Product:** one system in this repo: `mobile/` (Flutter) + `backend/` (Fastify/Postgres) + `admin/` (React CMS).  
**Plans:** `docs/superpowers/plans/2026-08-29-platform-production.md`  
**Slices:** [fast-build](./2026-08-29-fast-build-idoc-design.md) · [Play mobile packaging](./2026-08-29-play-store-idoc-design.md)

## Goal

Ship **Teen Bible Adventures** as a single product: App Managers publish YouTube lessons in admin, Postgres/API serve them, the Play Store app streams them. Play upload is the last mile of that pipeline, not a Flutter-only project.

## How the three parts connect

```
Admin (APP_MANAGER)  --HTTPS-->  Backend :8080  --HTTPS-->  Flutter (Play)
     POST /api/admin/biy-weeks         GET /api/hub/biy/weeks
     served at /admin/ when built      dart-define API_BASE_URL
     Postgres (Prisma)                 YouTube player (stream only)
```

- Native Android does **not** use CORS. Chrome/admin-on-another-origin does.
- Production admin is meant to be **same origin**: backend serves `admin/dist` at `/admin/`.
- Release Flutter must use `https://` API host via `--dart-define=API_BASE_URL=...`.

## Product locks (whole platform)

- Audience **13+**. Not Designed for Families. Not directed at under-13.
- Play **v1 Flutter:** no in-app account creation (avoids Google account-deletion rule). Church/parent accounts still exist **on the API** for admin and a later app version.
- Video: YouTube **stream only**. No YouTube download. Optional MP4 download stays debug-only until Android FileProvider is done.
- Play **v1 Flutter UI:** student-only. Teacher/parent switcher is debug.
- Package: `com.elasctroclud.teen_aventure`. Display name: Teen Bible Adventures.
- Ads: none. Category: Education.
- Target SDK 36.
- Secrets never committed (`.env`, `key.properties`, `*.jks`, `JWT_SECRET`).

## Success (all three)

1. `docker compose up -d` (Postgres) + migrate + seed.
2. Backend `GET /api/health` → ok.
3. Admin at `/admin/` (or Vite + API) logs in as APP_MANAGER and **saves a BIY week with a real YouTube URL**.
4. Flutter release AAB built with that API base URL plays that lesson.
5. Play Console listing + privacy URL + Data safety can be filled from `docs/play-store/` and `docs/legal/`.

## Status by surface

### Mobile (`mobile/`) — packaging mostly done

Done: theme, explorer home, quiz UI, YouTube player plumbing, Chrome debug, StoreConfig (hide demo roles/downloads in release), legal screens, targetSdk 36, cleartext off in release, R8, signing template.

Left: real YouTube URLs in `youtube_lesson_urls.dart` (fallback sample), keystore, hosted privacy URL, AAB upload, screenshots.

### Backend (`backend/`) — API exists; production hardening + content ops left

Done: Fastify routes (auth, hub, teen-quest, engagement, admin, media), Prisma schema, seed shape (placeholder YouTube IDs), Vitest API tests, CORS `origin: true`, static `/admin/`.

Left: Docker Compose for Postgres, production CORS allowlist, strong JWT, APP_MANAGER bootstrap, real seed URLs, optional BIY quiz server grading, `GET` list for admin BIY if we do not reuse hub GET.

### Admin (`admin/`) — ops dashboard; lesson CMS incomplete

Done: APP_MANAGER login, stats, churches, safeguarding close, **devotional** publish, deletions, scoring read.

Left: **BIY week publisher** (week number, title, YouTube `videoUrl`, quiz JSON) — this is the content pipe for Play. Teen Quest week editor is v1.1 unless needed for the first listing. Media/R2 UI is out of v1 if streaming YouTube only.

## Operator-only (hosting + Play Console)

1. Domain + TLS for API (and `/admin/`).
2. Managed Postgres (or the compose stack on a VPS).
3. `JWT_SECRET` ≥ 32 chars; never the `.env.example` value.
4. Host privacy/terms HTTPS; Play Console privacy field.
5. Upload keystore; `flutter build appbundle --release --dart-define=API_BASE_URL=https://api.example.com`.
6. Play forms: IARC, 13–17, Data safety, listing assets.
7. One APP_MANAGER user in the database.

## Out of v1 platform (explicit)

- Friends / Journal backends
- Play login UI and account deletion
- Offline FileProvider
- Admin CMS for every hub type (life prayers, marinade, prayer steps)
- R2 audio unless you ship life-prayer audio
- Pixel restyle of teacher/parent Flutter dashboards
