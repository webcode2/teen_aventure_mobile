# Teen Bible Adventures MVP — PRD coverage spec

**Date:** 2026-08-29  
**Source of truth:** repo PRDs (not the earlier Play-only IDOC)

| Document | Covers |
|----------|--------|
| `prd.txt` | Platform MVP: roles, auth/family/church, hub, engagement, privacy, scoring, architecture, launch |
| `PRD_2.txt` | App 2 — Spiritual Growth Hub modules + admin CMS for that content |
| `PRD_TEEN_QUEST.txt` | App 1 — Teen Quest dual quiz engine, teacher activate, blurred leaderboards |

**Surfaces:** `backend/` + `mobile/` + `admin/` are one product.

**Plan:** `docs/superpowers/plans/2026-08-29-platform-production.md`

## What this spec changes

The previous production plan treated Play Store packaging as the product and deferred login. **`prd.txt` §4.1 and §10 require authentication, family isolation, hub modules, scoring, nudges, reporting, and a Play submission.** Play packaging is Milestone 4, not a substitute for those features.

Excluded from this spec (PRD §12): live classes/video chat, general chat, free-text adult-to-child messaging, child-initiated Together Mode, AI, **iOS App Store**, Full Build analytics.

## Scoring (prd.txt §5 — implemented in API)

Use `ACTIVITY_POINTS` in `backend/src/routes/engagement.routes.ts`:

| Activity | Points |
|----------|--------|
| Prayer step / Salvation step | 28 |
| Scripture Marinade | 10 |
| BIY video | 20 |
| BIY weekly quiz | 50 |
| BIY weekly cap | 78 |
| Completed devotional | 78 |
| Life prayer / Bible chapter | 10 |

Ledger must not double-award. BIY weekly cap is already enforced on submit.

## Current coverage (honest)

### Backend — mostly MVP-complete

Auth, family, church/class, hub reads/writes, engagement (score, streak, jar, together, nudges), teen-quest (activate, server-side objs/scramble, blurred leaderboard), safeguarding, deletion worker, admin content POSTs. Vitest covers much of this.

Gaps: APP_MANAGER still needs bootstrap (seed env exists); CORS/production env; real YouTube IDs; BIY quiz answers still trusted on `engagement/submit` (Teen Quest objs are server-graded). Redis is out of the build.

### Flutter — UI is a teen explorer demo, not the PRD app

**Present:** adventure home/quiz chrome, local puzzle + objective quiz, YouTube player plumbing, `AuthService` / `ContentService` / `EngagementService` clients unused by screens, Play packaging flags.

**Missing screens (PRD):** login/PIN/teen-login; Spiritual Growth Hub (marinade, prayers, devotionals+private reflect, life prayers, bible reading); live Teen Quest activation wait; server-submitted objs/scramble; role-aware leaderboard from API; family jar / group jar / together (parent-started); predefined nudges; parent report; church join-code; deny-by-default role views wired to JWT (drawer role switch is local demo).

### Admin — ops dashboard, incomplete CMS and no teacher panel

**Present:** APP_MANAGER login, stats, churches, safeguarding close, devotionals, BIY week YouTube upsert, deletions, scoring read-only.

**Missing (PRD_TEEN_QUEST §5 + PRD_2 §4.3):** Teen Quest CMS (objs + scramble builders); teacher live activate/deactivate; teacher class leaderboard; CMS for marinade, life prayers, prayer steps; aggregate completion analytics (Full Build-ish — PRD 2 lists it; treat as Milestone 4 nice-to-have if time, else post-MVP).

## MVP launch acceptance (`prd.txt` §10) as checklist

1. Core mobile flows operational  
2. Backend + PostgreSQL operational  
3. Auth and role permissions tested  
4. Family and child isolation tested  
5. Core Teen Bible Adventures modules functional  
6. Bible Reading, Devotional, BIY functional  
7. Scoring, streaks, Jars, Together Mode functional  
8. Nudges and reporting functional  
9. Production Android build prepared  
10. Play Store submission package prepared  

## Play Store implication (because auth is in MVP)

If the app creates accounts, Google requires an in-app **delete account** path. Include it in Milestone 1/4 with family deletion API (`request-deletion`).
