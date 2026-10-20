# Agent handoff: remaining PostgreSQL → Firestore migration

Snapshot: **20 October 2026**. Repository: `/home/bash/Desktop/ASKADONAI/ask_teens_app`.

## Instruction for the receiving agent

Read `AGENTS.md` and `.cursor/rules/` before editing. Reuse `backend/src/firestore/` and compare each flow with its original SQL route/service and actual client callers. Preserve unrelated workspace changes. Implement, emulator-test and update the ledger after each batch.

The **only authoritative missing-route checklist** is [MIGRATION-QUEUE.md](MIGRATION-QUEUE.md), generated from [migration-status.json](migration-status.json). This handoff intentionally does not duplicate its endpoint checklist or per-module table.

Inventory rechecked on 20 October 2026: **218 original registrations, 218 native equivalents, 0 queued**. Both `/api` and `/api/v1` count once. The final four admin routes are registered. This is route coverage only: the bounded directory/role-count fallback is not the production index design. Use **MIGRATION.md → Current blocking service queue** for the exact remaining service work, including native lifecycle processing and production cutover. Regenerate the route inventory before starting work.

Account deletion, churches, classes, invites, quests, crossword and matching route registrations are already present. The live-game paths are included in the current count; parameter naming differences must not make them appear unimplemented. Existing route registration does not establish behavioral parity or package completion.

**Production is still PostgreSQL.** Q09 (scheduled lifecycle worker) and Q10 (production cutover) remain open and are not represented by missing-route counts. The native API must not be enabled for production until its routes, worker and integration behavior have passed the completion gate.

## Ordered work packages

- [ ] **Q07 — Admin production parity.** All inventoried admin routes are registered; finish the indexed people/role read models, list/count DTOs, pagination and UI integration described in MIGRATION.md’s current blocking service queue. Preserve live-role checks, pagination, privacy, totals, active-account time ranges, notification deduplication and lifecycle behavior. The admin CMS image-upload endpoint belongs to Q08's media integration even though its URL starts with `/admin`.
- [ ] **Q08 — Media and public/static integration.** The upload/read-URL and admin CMS image-upload routes are implemented and emulator-tested. Finish any response/UI/pagination gaps and the public/static integration. Complete public content/image serving, admin previews and native static-server parity. Preserve R2 and private-document boundaries. Inline `index.ts` server behavior is outside route-module counts.
- [ ] **Q09 — Scheduled lifecycle worker.** Replace the SQL scheduler/advisory lock and remaining SQL worker dependencies with bounded, resumable native Firestore jobs and fenced claims. Cover deletion/restore/purge, retention holds, age maintenance, group cleanup, abandoned uploads/applications and notification retries. Test retry/concurrency behavior; do not send inside retryable transactions.
- [ ] **Q10 — Production cutover and final testing.** Finish IAM/secrets/origins, indexes/rules, native function entry points, staging parity, fresh seed/content preparation and rebuilt deployment artifacts. Remove SQL runtime requirements only after all production-reachable paths are native. Keep deployment blocked until these checks pass.

**Q01–Q06:** native route registrations are present. Keep their packages open for behavioral parity and integration testing; read current evidence and unresolved service gaps in [MIGRATION.md](MIGRATION.md). Do not reimplement existing routes based on the old handoff snapshot. The notes below are verification/dependency requirements, not a second missing-route list.

## Native-route parity and service integration review

Review these requirements against current code and test evidence. Some services have advanced since these notes were first written. Resolve actual gaps without treating this section as proof that a route is absent. Route registration alone is not completion.

1. **`GET /auth/me`**: adult and child contracts were emulator-checked against `backend/src/routes/auth.routes.ts`, including `userId`/`childId`, `platformRole`, family/church context, age fields, phone/bio/avatar, profile permissions, birth-year and password flags, adult-upgrade availability, assigned classes, children, memberships, and cap usage. Deleted and disabled users and children are omitted and cannot authenticate. Password hashes, PIN hashes, and reset secrets are not returned. Points are the sum of maintained month activity buckets; streak values are read from `streak/{childId}` and stay zero until quest scoring writes them.
2. **Family responses and memberships**: `/families/my`, family creation, and child create/edit responses now follow the original roster fields and hide credentials and family-class join codes. `/auth/me` reports the original guardian count for adults and the home-family plus church/custom enrollment count for explorers. Create and guardian writes still enforce only the existing five-family guardian check, so global cap parity across every group type is not established.
3. **Independent-login controls**: `PATCH /families/children/:childId/independent-login` is parent-only and teen-only. Enable synchronizes the child and login email claims and stores a password hash; a 4-digit PIN is rejected. Email and push outbox documents are created after the transaction commits and are not sent inside it. Disable clears independent login and the child email claim, keeps the user email claim, and increments `authVersion` so the existing independent JWT fails in the request hook. The generated route state remains `native_implemented_parity_pending`.
4. **CMS/public preview**: content and site-page CRUD exist, but media/image endpoints, actual admin preview and public serving parity remain. Compare public page-list ordering/fields with `index.ts` (original sorts by title; native currently sorts by update time). Verify desktop/mobile preview, editable ministry gateway text, legal links, linked-page deletion warning/confirmation and missing-page alerts through the real UI.
5. **Large native catalogs**: native site-page/nudge catalogs reject over 200 records; consent catalogs reject over 100; device lists have a bounded limit. Add reviewed cursor pagination and client integration where those limits must support larger deployments; do not silently truncate. Review all native query caps against product requirements.
6. **Scoring integration**: atomic `FirestoreStore.award` and chart buckets exist, but route/service authorization, completion validation, streaks, milestones, achievements, full progress summaries and game reward integration do not. Never expose caller-selected points/time/reference keys as a way to award arbitrary points. Keep stored game IDs and published versions consistent.
7. **Password-reset outbox**: native immediate email delivery and fenced retries exist in `src/firestore/reset.ts`. The native scheduled retry drain is not wired; implement bounded selection, expiry/body/token cleanup, lease recovery and integration with the broader notification worker. Redact reset-link bodies from future admin outbox APIs. Keep stable provider keys and never send inside retryable Firestore transactions.
8. **Devices**: native registration/list/removal exists, including upgraded explorer identity consistency. Complete admin device management, actual push recipient resolution, dead-token cleanup, provider/client event deduplication and lifecycle removal.
9. **Consent**: catalog/acceptance/status routes exist. Finish lifecycle, safeguarding and jurisdiction integration; preserve the original field contracts. Test role/ownership boundaries and no duplicate acceptance. Any changes to consent semantics need explicit product decisions, not assumptions introduced by migration.
10. **Transaction/uniqueness coverage**: foundation claims/leases cover only implemented flows. Apply deterministic uniqueness and atomic state transitions to invitations, memberships, published versions, quest completions, notification events and lifecycle operations. Preserve null/timestamp/ID semantics and account-deletion restrictions. Do not assume Firestore parent deletion cascades.

## Inline routes, server behavior and workers outside the generated route count

The inventory counts route-module registrations and both `/api` and `/api/v1` aliases once. It does not inventory every inline/server task.

- [ ] `GET /api/` and `/api/v1/`: original API information response.
- [ ] `/api/health` and `/api/v1/health`: preserve deployment/client contract; native health currently reports incomplete migration.
- [ ] `GET /api/content/files/:name` and versioned alias: content image retrieval, MIME/cache headers and safe paths. Keep R2 production storage and private uploads separate.
- [ ] Recheck inline content/platform and public page routes against existing native versions (including invalid platform handling, published visibility and list ordering).
- [ ] Admin SPA/static assets and SPA fallback from `src/index.ts`: native factory does not yet provide the original static hosting behavior. Unknown API routes must not return the SPA. The current native 503 fallback is temporary while migration is incomplete.
- [ ] Native server setup parity: CORS, cookies, multipart/file size limits, body limits, validation/error DTOs, identity/role hooks, password-change gates, media authorization and response headers. Add tests; do not simply reuse a SQL plugin that imports Prisma.
- [ ] `src/functions.ts` deploys the Prisma API: `teenApi` calls `buildServer`, and `teenLifecycle` uses the PostgreSQL advisory lock. Do not point this entry at Firestore.
- [ ] `src/workers/lifecycle.worker.ts`: migrate scheduled account deletion, legacy-family adoption/purge, three-day standalone group/member removal, family retention transitions, age-band maintenance, abandoned application/private-upload cleanup and notification retries. Inspect the entire current worker; use bounded resumable cursors and cross-instance fencing. Account/family deletion remains 30/90 days, not the standalone group's three-day grace period.
- [ ] Replace every reachable SQL-dependent helper and raw query; do not merely remove imports or redirect all operations through an in-memory Prisma emulator. Check `lib/self-deletion.ts`, `memberships.ts`, `group-detail.ts`, `people-directory.ts`, `church-applications.ts`, `notify.ts`, `scoring.ts`, `streak.ts`, `quest-progress.ts`, `achievements.ts`, `community-stats.ts`, game publish/delete/storage helpers, and every dependency they call.
- [ ] Native public/admin resource alerts must still work when a linked page is deleted or unpublished.

## Deployment and final data tasks

- [ ] Project is **`tbadventure-f712a`**, Firestore database **`(default)`**, Madrid **`europe-southwest1`**. Do not deploy to the separate similarly named `tbadventure` project.
- [ ] `deploy/google/target.json` is the Prisma PostgreSQL function. Do not set the runtime database back to Cloud Firestore.
- [ ] Complete/review indexes and index exclusions, then deploy rules/indexes to the explicit selected project and verify staging queries. Emulator success does not validate production composite indexes or IAM.
- [ ] Attach runtime ADC service-account permissions for Firestore/FCM; configure email/R2 secrets, production origins and public URLs. Do not bundle private Firebase keys or retain emulator host variables in production. Keep the lifecycle function private with Scheduler OIDC.
- [ ] Keep `DATABASE_URL`, the SQL secret mapping, and Prisma generate in the function package. Regenerate `.deploy/google-functions` from `deploy/google/prepare.mjs` after dependency changes.
- [ ] Ensure packaged seed/game fixtures and shared contracts are available at their expected runtime paths. Test actual staged artifacts, not only source factories.
- [ ] User authorized a **fresh production seed** because existing data is development data. No old-record import is required under that decision. Do not reset/seed the old SQL database. Use the create-only Firestore seed with explicit project confirmation and privately supplied bootstrap credentials; verify expected counts and rerun preservation.
- [ ] Seed legal pages are unpublished review drafts; game fixtures are staged and quest assignments are not all published. Supply reviewed policy text and valid published game assignments for final testing; do not publish placeholders automatically.
- [ ] Run full staging mobile/admin/public website flows, API alias/DTO parity, negative permissions/privacy cases, concurrent idempotency/caps, deletion/restore/purge boundaries, provider failure/retry/crash cases, startup/cold-start behavior and bounded query/read cost checks.
- [ ] Regenerate migration status; missing queue must be empty AND all partial-route/service/worker/static gaps closed before marking migration complete and deploying.

## Rules the receiving agent must preserve

- Preserve all unrelated dirty workspace changes; do not commit unless asked.
- No Word Scramble/scrambleQuiz or Word Chains modes. Only scripture crossword and matching studios; weekly Objective Quiz remains separate.
- Scoring defaults: video **7**, Objective Quiz **3**, puzzle **3**, prayer **1**. Milestone durations **1 / 1 / 4**, including **Ardent Reader**. Do not overwrite existing scoring or admin edits with a seed rerun.
- Parents/main accounts can view all their linked children's groups, including accepted standalone-teen invitations. Hide other participants' surnames and points at the API; retain their own children's full details.
- Ministries may use approved system nudges and have at most **30** custom messages. Preserve review/rejection/resubmission/revocation and permission checks.
- Account/main-account deletion includes subaccounts; ministry deletion includes its groups/teachers while preserving shared/external responsibilities. Password verification is required before triggering deletion.
- Every account/ministry deletion follows **0–30 days recoverable; 30–90 backend-only; 90+ personal-data purge**. Immediate admin purge is allowed after password confirmation and applicable holds. Archive retains only an audit entry after personal data purge.
- Use native indexed/bounded Firestore queries, deterministic claims and atomic transactions. Send email/push and change external storage only after committed claims, never inside retried callbacks.
- Never print tokens, password hashes, DB URLs, private documents or service-account secrets.

## Verification commands and last evidence

Current test evidence is recorded in [MIGRATION.md](MIGRATION.md). Re-run the relevant suites for each change; route inventory refresh is not a runtime test and does not establish parity. Production remains PostgreSQL.

Run source typecheck from repository root:

```bash
./backend/node_modules/.bin/tsc -p backend/tsconfig.json --noEmit
```

The Firestore emulator, its port 8085 config, and `vitest.firestore.config.ts` have been removed. Do not start a Firestore emulator for this app.

**Do not run the default backend test configuration:** its setup can reset the configured SQL database. Function-adapter tests have their own isolated `vitest.functions.config.ts`. Admin and Flutter checks must follow workspace instructions.

Refresh the queue after each tested batch:

```bash
cd backend
npm run migration:status
```

Update `MIGRATION.md` with actual evidence and remaining dependencies. A registered route is labeled `native_implemented_parity_pending`, not automatically verified complete.
