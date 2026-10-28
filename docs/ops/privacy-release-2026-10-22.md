# Privacy release — 22 October 2026

Deployment target remains Google Cloud Run functions (Madrid), Prisma/PostgreSQL on Neon, and Cloudflare frontend hosting. No seed or database-reset operation is part of this release.

Changes:
- Stop logging ministry verification codes; remove legacy local verification log.
- Notification history exposes metadata only; omit message bodies, payloads, idempotency keys, and raw provider errors.
- Ministry/applicant portal tokens remain in memory; remove legacy localStorage entries. Reloading requires signing in again.
- Masked group standings expose no rank, score-based ordering, or aggregate score; authorized views retain standings.
- Request logging removes query strings and redacts authentication headers/cookies.
- Account emails use durable outbox delivery and Teen Bible Adventures branding.

Validation: backend/dashboard production builds; eight focused privacy/session regression tests; eighteen function adapter tests; deployment configuration tests; backend and admin TypeScript checks.

Release bundle: `.deploy/google-functions-privacy-20261022` (ignored, allowlisted source only). Runtime values preserved from the live API; credentials referenced through Secret Manager. Cloudflare version: `55865817-f4e6-49db-b7cb-439b11b72db0`.

Cloudflare domains verified to serve the current build. Google API revision `teen-api-00012-qaj` and worker revision `teen-lifecycle-00003-nop` deployed successfully. Scheduler remains enabled every 30 minutes with authenticated OIDC invocation.

Authenticated production checks passed: editor login, no bearer token in login response, Secure/HttpOnly/Strict cookie, metadata-only notification history, redacted provider errors, private/no-store caching, anonymous history rejection, and logout. Temporary test account removed. API health returned HTTP 200; anonymous lifecycle invocation returned HTTP 403. No migrations, seed, or production reset ran for this release.

Historical cloud logs and previously delivered email copies are not erased by deploying this release. Existing browser sessions remove legacy tokens on the next page load.
