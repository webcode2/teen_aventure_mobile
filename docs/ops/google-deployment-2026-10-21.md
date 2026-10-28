# Google deployment preparation — 21 October 2026

Target: `tbadventure-f712a`, `europe-southwest1`, Prisma/PostgreSQL on Neon.
Functions are deployed and verified. Public access is enabled after secure administrator setup.

- Billing linked to the user-approved Elastro cloud account; required APIs enabled.
- Dedicated `teen-runtime` and `teen-scheduler` service accounts created.
- User approved the runtime FCM role and per-secret access to six production secrets.
- Six deployment secrets stored in Google Secret Manager; no values stored in this document.
- Production bundle: `.deploy/google-functions-cookie-session-20261021`.
- Builds and 18 isolated deployment tests passed; packaged dependency audit: zero known vulnerabilities.
- Neon initially had zero public tables. Historical migration `20260830230000_teen_quest_videos` failed because no prior migration creates TeenQuest.
- Saved the partial schema, reconciled it atomically with the current Prisma datamodel while every application table was empty, and verified zero schema difference.
- Recorded a schema baseline for all 61 migration files with Prisma migrate resolve. No seed/data-migration scripts were run during baselining.
- With user approval, copied a consistent read-only snapshot of 278 local records across 44 tables to Neon in one transaction. Verified row counts, foreign keys and canonical SHA-256 hashes of every copied record. The source records and scores were not changed.
- Private recovery files are under ignored `.deploy/backups/20261021-neon-first-deploy` (directory 0700, files 0600). Do not commit or upload these backups with the function source.

Storage, secrets, data transfer, migrations, deployment, worker invocation and live functional checks are complete. Public launch completed after the user approved disabling the four development staff logins in Neon and creating a real APP_MANAGER account with an emailed password-setup link.

## Deployment verification and current access state

- API and dashboard deployed in Madrid (`europe-southwest1`); canonical origin: `https://teen-api-171803564695.europe-southwest1.run.app`.
- Private lifecycle worker deployed in Madrid and invoked successfully with HTTP 204. Anonymous invocation returned 403.
- Scheduler `teen-lifecycle` runs every 30 minutes in `europe-west1`: Cloud Scheduler does not support Madrid. Deployment script now has a separate scheduler-region setting.
- All 14 existing private uploads copied to the private R2 bucket and verified by SHA-256; local originals preserved.
- Public R2 origin corrected and verified with a temporary object; test objects removed.
- Live checks passed for Secure/HttpOnly/Strict cookies, seven-day expiry, session restore, protected puzzle API, tampered cookie rejection, CSRF checks, logout, and an authenticated private multipart upload. Temporary test users and synthetic document removed.
- Direct browser-to-R2 upload was blocked by bucket CORS; added an authenticated multipart fallback using the existing private R2 driver, with client/server regression tests. It preserves content-type and size validation.
- Final audit found the four imported development staff accounts still accept the published demo password. Public API/site invocation was temporarily removed to protect production data; no staff credentials have been changed yet.
- User approval requested to disable only those four Neon logins, create a production APP_MANAGER for the chosen real email, and send a password-setup link. Source/local accounts are not to be changed.
- Production login prefill and demo shortcuts removed and tested; secured frontend revision `teen-api-00003-sal` is deployed privately. Public access must remain restricted until real-admin setup is authorized and complete.

## Public launch completed

- API revision: `teen-api-00003-sal` (Node 22).
- Login: `https://teen-api-171803564695.europe-southwest1.run.app/app/login`.
- User explicitly approved disabling the four named development staff logins only in Neon; all four are now inactive. Local accounts and ministry records were preserved.
- Created the user-approved real APP_MANAGER with mobile login disabled and an unknown random initial password. Sent a one-hour password-setup link through the deployed reset flow; mail outbox status confirmed SENT. No plaintext password was emailed or retained.
- Restored public Cloud Run invocation after administrator setup. Production demo shortcuts and credential prefill are absent from the live bundle.
- Worker stays private; authenticated Scheduler invocation succeeded with HTTP 204.
- Deployment metadata and private operational reports are saved in the ignored backup directory.
- The temporary operator input file `/tmp/teen-production-secrets.env` remains owner-readable (0600); runtime secrets are in Google Secret Manager. Do not commit or upload operator inputs/backups.
