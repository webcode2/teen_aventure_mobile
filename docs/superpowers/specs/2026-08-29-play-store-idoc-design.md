# ASK Hub Teen — Play Store Readiness IDOC

**Date:** 2026-08-29  
**Companion:** [fast-build IDOC](./2026-08-29-fast-build-idoc-design.md)  
**Plan (mobile slice):** `docs/superpowers/plans/2026-08-29-play-store-readiness.md`  
**Canonical product (admin + backend + Flutter):** [PRD MVP spec](./2026-08-29-prd-mvp-design.md) — Play is Milestone 4, not the whole product.

## Goal

Ship an Android App Bundle that Play Console will accept (Flutter/Play slice). Live lessons also need admin + API — see the platform IDOC. Unique package, signed release, target API 36, 13+ teen listing, no demo chrome, HTTPS-only networking, privacy policy, and a completable student loop (home → YouTube lesson → quiz).

## Product locks (do not reopen)

- **Audience:** 13+. Not Designed for Families. Not directed at children under 13.
- **v1 accounts:** **Required by `prd.txt` §4.1.** Parent register, child PIN, teen login. In-app account/family deletion is required for Play. The earlier “no login in store build” lock is withdrawn.
- **v1 video:** YouTube stream only. Offline download stays debug-only until FileProvider is production-ready.
- **v1 roles:** student only in release. Teacher/parent switcher is debug.
- **Package ID:** `com.elasctroclud.teen_aventure` — confirm before first upload; changing it later creates a new app.
- **Display name:** Teen Bible Adventures (≤30 characters).
- **Category:** Education.
- **Ads:** none.
- **Target SDK:** 36 (Play requires API 36 for new apps/updates from 2026-08-31).
- **YouTube:** official in-app player only. Do not download YouTube media.

## Success

`flutter build appbundle --release --dart-define=API_BASE_URL=https://YOUR_API` produces a signed `.aab`, quizzes are reachable without a debug guardian toggle, and Play listing docs in `docs/play-store/` can be pasted into Console.

## Operator-only (cannot be finished in this repo)

These stay on the task list until you complete them in Play Console / hosting:

1. Create upload keystore locally; never commit `key.properties` or `*.jks`.
2. Host privacy policy + terms at a public **HTTPS** URL; paste into Play Console.
3. Play Console: app access, content rating (IARC), target age 13–17, Data safety form, store listing assets, countries, pricing (free).
4. Paste real YouTube IDs (still the content blocker from the fast-build IDOC).
5. Production API hostname + HTTPS cert.
6. Phone screenshots (2+), 512×512 high-res icon, 1024×500 feature graphic uploaded in Console.
7. Play Console developer account ($25) if not already registered.

## In-repo work

See the implementation plan. Highest risk if skipped: debug signing on release, `10.0.2.2` in store builds, Dio logging with `DEBUG` default true, FlutterDownloader `ignoreSsl: true`, guardian-locked quiz, launcher name `teen_aventure`.
