# Cloud Firestore target

Selected by the user on 20 October 2026. Compute remains Google Cloud Run functions; the database target is **Cloud Firestore Standard/native mode**, not Realtime Database or Firebase SQL Connect. Reusing existing Firebase client configuration does not migrate server data.

## Migration records

Start with [MIGRATION.md](MIGRATION.md), then use the generated [missing-route queue](MIGRATION-QUEUE.md) and [machine-readable inventory](migration-status.json). Refresh after changes with `cd backend && npm run migration:status`. The ledger separates implementation, test evidence, remaining parity work and production wiring.

## Honest readiness status

Firestore configuration and backend client initialization remain in the repo. **The deployed function and the live API use Prisma/PostgreSQL.** Do not point `deploy/google` back at Firestore. See [the Google deployment spec](../google/README.md).

Do not remove PostgreSQL, change production datasource variables, import records or deploy rules to an existing Firebase project automatically. Existing records and the working API remain intact. The user created the Madrid database; this code preparation has not contacted the live database.

## Prepared files

- `firebase.json` and `.firebaserc` in this directory: Firestore rules and indexes. There is no local emulator. Run Firebase CLI commands from `deploy/firebase`. The FlutterFire file stays at `mobile_/firebase.json` because that CLI resolves paths from the Flutter project.
- firestore.rules: denies all direct client access. Keep mobile/dashboard on the authenticated API. Server Admin SDK bypasses rules, so runtime IAM and API authorization remain mandatory.
- firestore.indexes.json: includes the implemented ministry-role lookup and index exemptions for internal unique-key/lease documents. Other queries still need reviewed indexes during migration; do not treat this initial manifest as complete.
- model-inventory.json: all 44 current Prisma model shapes, keys, unique fields, relation ownership and cascade requirements; metadata only, no account records.
- backend/src/lib/firestore.ts: lazy named Admin SDK client using attached runtime credentials. Existing API code does not yet call it.

Database selection does not automatically replace the current account/password system with Firebase Authentication, or R2 with Firebase Storage. Those are separate product/infrastructure changes; preserve the current interfaces during the database migration.

## Required implementation before deployment can be enabled

1. Define repositories for the inventoried models and implement Firestore queries with bounded page sizes, cursor pagination and reviewed composite indexes. Do not emulate Prisma by loading complete collections or performing joins in memory.
2. Preserve existing IDs, child-to-main-account ownership, ministry/teacher authorization, participant privacy, published-game versions, weekly Objective Quiz and scoring rules.
3. Replace SQL uniqueness with transactionally created deterministic key documents (for canonicalized email, invite/reset tokens, enrollment pairs, quest completions and notification idempotency). Hash sensitive unique keys instead of exposing raw tokens/emails in document paths.
4. Replace SQL transactions/advisory locks with Firestore transactions and durable leases. Score awards must remain atomic/idempotent. Retry callbacks must not send pushes, email or modify external storage because Firestore can retry transactions.
5. Implement bounded, resumable cascade jobs for account/ministry deletion: 0–30 days recoverable; 30–90 backend-only; 90+ purge; immediate admin purge only with password confirmation and existing retention/hold rules. Archive keeps only the audit entry after personal data is purged. Firestore parent deletion does not automatically delete subcollections.
6. Replace PostgreSQL analytics/raw SQL with incrementally maintained summaries and exact per-period unique-activity records. Preserve counts and time-zone semantics without scanning a year of activity on each dashboard request.
7. Rework notification delivery claims, retries, stable event IDs and device handling for concurrent function instances. External sends occur after committed claims; acknowledge the crash-after-send window and use provider/client deduplication where supported.
8. Store large puzzle/content payloads and deletion snapshots in bounded documents/chunks where needed. Respect Firestore document/index/transaction limits; do not store media binary data in documents.
9. Use the user-authorized fresh Firestore production seed; existing SQL data is development data and does not need importing. Rehearse the create-only seed in the emulator/staging environment, preserve scoring defaults and admin edits, and verify all 52 weeks and initial content. Do not reset the SQL database.
10. Firestore emulator tests do not replace the Prisma deployment. The Cloud Function in `deploy/google` runs `buildServer` and the SQL lifecycle worker.

## Firebase provisioning when migration is ready

Choose the Firebase project and Firestore location deliberately before database creation; co-locate compute where supported. Attach a least-privilege runtime service account with Firestore data access and FCM permissions. Production uses ADC, never a bundled private service-account key. Deploy rules/indexes only to the explicitly selected project after reviewing the index manifest. No public client database access is required for the current API design. The local Firestore emulator has been removed.

Firestore has its own daily read/write/delete quotas, storage quota and paid operations; function free compute does not include unlimited database operations. Enable billing alerts and monitor query reads/index costs. TTL deletion, backups and other optional features may require billing and do not replace the application's deletion lifecycle.

References:
- https://firebase.google.com/docs/firestore/quotas
- https://firebase.google.com/docs/firestore/security/get-started
- https://firebase.google.com/docs/firestore/query-data/index-overview
- https://firebase.google.com/docs/firestore/manage-data/transactions

## Implemented native foundation (20 October 2026)

`backend/src/firestore/store.ts` implements atomic unique-key creation, token-fenced expiring leases, once-only score ledger + UTC activity-bucket updates, create-only seed writes and a transactionally enforced ministry custom-nudge count of 30. These operations use the Admin SDK directly. They are not a Prisma compatibility layer and are not wired into the existing production API.

### Fresh seed

The initial seed contains 78 create-only records plus the explicit bootstrap admin: 52 quest weeks and objective quizzes, scoring rules 7/3/3/1, milestones 1/1/4 including Ardent Reader, approved system nudges, CMS defaults, staged crossword/matching fixtures and unpublished legal-page drafts. It does not fabricate 52 published games or publish placeholder legal policies. Game promotion/quest assignment and reviewed policy text are required before final end-to-end testing. No demo credentials are baked in and reruns never change an existing admin password or edited content. Business record IDs use deterministic UUIDs compatible with the current API validators.

From backend, inspect a plan without credentials or a database connection:

```bash
npx tsx src/firestore/seed-cli.ts --project=demo-teen-firestore-tests
```

Do not apply that plan to a live project from this repository. The Firestore emulator and its test suite have been removed.

Confirmed deployment target for the product API remains Prisma on PostgreSQL. `.firebaserc` in this directory records `tbadventure-f712a` for Firebase CLI rules only.

`backend/src/firestore/server.ts` now provides native Firestore `/api` and `/api/v1` routes for:

- Adult registration and dashboard/adult login with persistent cross-instance password lockouts.
- JWT session verification against the current account role, active flag and pending-deletion state; no password hashes returned.
- Basic authenticated account payload, family creation, family roster and parent-managed explorer creation.
- Public and admin CMS content read/update, public published pages and admin page creation/update/deletion.
- In-use linked-page deletion warnings, explicit deletion confirmation and missing/unpublished app-resource alerts.

This factory is deliberately separate from the deployment entry point. It returns 503 for unmigrated routes instead of falling back to PostgreSQL. Parent profile/PIN flows, ministry/group workflows, games/awards/streak integration, reporting/analytics, full deletion/restore/purge, notifications, media endpoints and other route parity are still incomplete. **Do not switch the deployed API to this factory yet.** This is conversion progress, not a complete backend migration.

Indexes for the migrated role, guardian and page queries are in the Firestore index manifest; tests against the emulator do not prove production indexes have been deployed.

Latest verification: **92/92 consolidated emulator tests**, followed by **23/23 focused admin/deletion regressions** after final changes; backend and dashboard TypeScript checks passed. These checks cover implemented flows and do not establish complete worker/cutover parity. No live Firebase records were written. Detailed evidence and logs are in MIGRATION.md.

The native API also implements independent teen registration/login and parent-linked teen credentials, plus ministry/admin nudge-catalog submission and moderation. See the ledger for limitations, evidence and the remaining queue.

Queue execution now includes profile and credential edits, PIN/parent-switch controls, guardian additions, family/child edits, adult upgrades with retained history, reset email claims, bounded personal statistics, devices, admin scoring/milestones, and consent catalog/acceptance. See MIGRATION.md for the remaining feature and worker dependencies.

Current route coverage: **218/218 mounted, zero missing registrations**. Q07 still requires production indexed directory/distinct-role summaries; the temporary exact adapter rejects sources over 2,000 rows. See MIGRATION.md’s current blocking service queue for native lifecycle/delivery/purge and cutover work. Deployment remains blocked; all-route registration is not parity.
