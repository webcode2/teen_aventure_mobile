# Client data leakage fixes

Client visibility excludes archived/deleting identities and their family, ministry and group resources. Shared family views, ministry people/rosters, memberships, standings, messages and notifications filter linked records too. Group availability is checked in the common authorization path, including leaderboard endpoints. A retained assignment cannot reopen an archived group.

Ministry authorization loads the actual role for the ministry/class in the request. A role in another ministry cannot authorize it. Editor and Super Editor dashboard accounts cannot bypass ministry permissions; the sole Super Admin retains operations access.

Client JSON responses redact credential hashes and internal archive/re-registration fields recursively. Credential hashes are also removed for admin responses. Non-public API JSON uses `private, no-store`; published website/app content remains public and continues through the existing Cloudflare/R2 route.

Public invitation previews do not return recipient email. Archived/deleting resources and archived inviters cannot be previewed or joined. Archiving invalidates their one-time invitations and cancels queued unsent notifications. The delivery worker suppresses legacy email queued before an address was archived, so later email reuse does not receive the old account's queued message. Already delivered messages cannot be recalled.

Peer-masked standings do not expose scores through ordering, ranks or aggregate totals. Notification history is Super-Admin-only and contains an explicit metadata allowlist, excluding message bodies, payloads, setup links, provider error details and idempotency keys. Request logging omits query strings, authentication headers and one-time invitation paths.

Validation uses only fresh temporary schemas and generated fixtures. `ROLE_TEST_ONLY=1 npm run test:deletion` covers privacy and role authorization; `npm run test:deletion` covers archive/deletion lifecycle; `vitest run --config vitest.leakage.config.ts` covers ranking, history and log redaction. No production accounts or scores are changed by verification.

Owner recovery of legacy pending households is explicitly separated from normal membership visibility: only the owner can restore an eligible pending family, and unrelated users cannot use that recovery route.

Validation passed: 13 isolated privacy/role tests, 26 isolated archive/deletion tests and 5 leakage regression tests (44 total). Live checks returned API health 200, unauthenticated notification-history access 403 with `private, no-store`, and published-content source `r2`. Worker revision `teen-lifecycle-00004-keq` includes archived notification suppression. No real account or score was modified for verification.

Final API revision: `teen-api-00014-big` (ACTIVE), including the tested owner recovery compatibility path. Deployment verified on 2026-10-22.
