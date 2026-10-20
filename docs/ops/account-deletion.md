# Account and ministry deletion

Implemented 18 October 2026. The primary app database migration is `20261018210000_account_deletion_lifecycle`.

## User-facing flow

- App: Account → Account deletion & recovery. Opens the HTTPS website `/delete-account` in a webview; no credentials or bearer tokens are placed in the URL.
- Website: footer → Delete account. The same public page permits requests, status checks and recovery without a normal app session.
- Ministry dashboard: Delete account & ministry opens `/delete-account?churchId=...`. Only the matching pastor can request that ministry's deletion.
- Email/password and explicit confirmation are required. Password failures are rate-limited using a database-backed per-identity window, shared across function instances.
- Under-15 profiles cannot independently delete accounts. Their main account manages the household. Missing birth-year data must be completed before independent self-service deletion.
- Main-account scope includes owned families, linked subaccount identities, profiles, progress and owned groups. Ministry scope adds ministry groups, assignments and exclusive ministry staff accounts. Shared staff with independent families or another ministry responsibility retain their personal accounts. Privileged cross-account dependencies can require transferring responsibilities before a request is accepted.

## Lifecycle and administrator decisions

- Request: records remain in place; affected logins and client group access are suspended. Exact resource IDs and prior visibility/active flags are captured transactionally.
- Before 30 elapsed days: password-verified owner or authorized operations admin can restore the graph, including originally disabled flags and memberships. Restoration is rejected at the deadline even if the worker has not run.
- Day 30 through day 90: backend-only, no self-service recovery.
- Day 90 onward: scheduled purge. Legal retention dates and locked open safeguarding investigations postpone purge and are rechecked.
- Authorized operations admins can **Delete completely now** before day 90. This requires a fresh password and explicit irreversible confirmation. It cannot bypass safeguarding/legal retention holds.
- **Move to archive** is filing, not indefinite retention of personal data. Archived records keep the original purge deadline. After purge, only non-identifying counts, request/archive/purge dates and scope remain; owner/resource IDs and recovery snapshots are scrubbed.
- Dashboard → Archive → Users archive lists account archive entries. Church archive also includes ministry lifecycle audit entries. Archived users are excluded from the normal people directory.
- Dashboard → Deletions lists pending account/ministry requests with restore, archive and immediate-purge controls. Legacy family-only records remain visible below it.

## Storage, retries and deployment

`runScheduledLifecyclePass(now)` in `backend/src/workers/lifecycle.worker.ts` awaits the complete lifecycle, private-document cleanup, age/group housekeeping and notification retry pass. A Google scheduled function must invoke and await it in production. The local interval loop is not a substitute for a deployed schedule.

Deletion transactions use serializable retries and database locks. Outbox/address/device associations and linked identities are removed at purge. Private application document keys remain as sanitized cleanup markers until object deletion succeeds; the worker retries failures. Legal/closed safety-case history may be retained without account foreign keys according to the privacy policy.

Legacy 90-day family requests are adopted into a durable purge job before deletion so failed purges retry and uncomplicated owner/linked identities are cleaned too. Identities with another household or ministry responsibility outside a legacy family-only request are preserved. Standalone class-group removal keeps its group-specific notice. Family deletion can no longer bypass the account lifecycle through the group-removal endpoint; old three-day family requests are converted into the account lifecycle.

Apply migrations and regenerate Prisma before deploying API code. Deploy the public page and set Flutter `WEB_BASE_URL` to its HTTPS host. Verify storage configuration, schedule, monitoring and backup retention/restore procedures separately; this code does not erase historical database backups or deploy Cloud Functions.

## Verification

- `cd backend && npm run test:deletion`: creates a fresh random schema using `TEST_DATABASE_URL`, verifies the actual additive migration against the prior schema, runs lifecycle/API tests and removes only that schema. No seed/resetDatabase or existing application data is used.
- Dedicated tests are excluded from the normal backend test setup, which otherwise resets its configured database.
- Tests cover exact boundaries, under-age restrictions, shared password lockout, linked-account recovery/purge, ministry staff ownership, cross-ministry denial, concurrent requests, JWT revocation, admin password confirmation, retention holds and archive metadata after purge.

## Verification result (18 October 2026)

- Additive migration applied to the configured app database; stored migration checksum matches the file.
- 20 isolated backend migration/lifecycle/API tests passed, 14 targeted dashboard tests passed and all 86 Flutter tests passed.
- Backend unused-symbol typecheck and dashboard production build passed. Flutter analysis reports 73 pre-existing informational findings, with no errors or warnings.
- The configured app database contained zero account-deletion test requests after testing; all temporary test schemas were removed.
- No existing account, ministry or uploaded document was deleted during verification. Cloud Functions deployment and its production schedule are still separate deployment work.
