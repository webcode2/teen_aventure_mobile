# Google Cloud Run functions deployment

The Cloud Function runs the Prisma/PostgreSQL API. `teenApi` calls `buildServer`, and `teenLifecycle` runs the SQL lifecycle pass under a Postgres advisory lock. Firestore is not the deployed database. `FIREBASE_PROJECT_ID` remains for FCM only.

Prepared 20 October 2026. This is a deployment package, not a record of a live deployment.

## Platform choice and cost

Use Google Cloud Run functions (2nd generation, request-based billing) for Fastify + Prisma + PostgreSQL, the dashboard and website. Google's monthly request-based free allowance is 180,000 vCPU-seconds, 360,000 GiB-seconds and 2 million requests, based on us-central1 pricing. Cloudflare Workers Free offers 100,000 requests/day but only 10 ms CPU/invocation: bcrypt and this existing Node/PostgreSQL backend are a poor fit without a substantial rewrite. Request counts alone do not determine usable compute.

Sources: https://cloud.google.com/run/pricing and https://developers.cloudflare.com/workers/platform/pricing/ . Rates/eligibility can change. Billing must be enabled. Database hosting, R2 storage, email, network egress, Scheduler, Cloud Build, Artifact Registry and Secret Manager have separate pricing/free quotas. Min instances zero and instance caps reduce costs; they do not enforce a zero-cost budget. Configure billing alerts. Cold starts are expected.

Default region is us-central1 for pricing predictability; choose a region near your PostgreSQL provider and users when latency/residency matters. No region or database is moved automatically.

## Runtime design

- `teen-api`: public HTTP function; existing API authentication remains enforced. Fastify is initialized once per instance. API routes, website and built dashboard share the function origin.
- `teen-lifecycle`: separate IAM-private HTTP function, invoked by Scheduler with OIDC every five minutes. It awaits the full deletion/age-band/notification retry pass. A PostgreSQL advisory transaction lock prevents overlapping scheduled passes. Scheduler retries failures; external providers still require their own delivery idempotency.
- No local timers, port listeners or development tunnel proxies execute in either function.
- CMS text remains in PostgreSQL. New content images and private identity files use R2; functions never rely on writable local disk for persisted uploads. Public content-image routes proxy only `content-images/`; private uploads retain authenticated access.
- FCM uses the attached runtime service account (Application Default Credentials), avoiding a bundled private JSON key.

## Prerequisites

1. Install Node 22 and gcloud CLI; authenticate and select your intended billing-enabled Google project. CLI is not installed in the current development environment.
2. Provision PostgreSQL with TLS. Use a provider-supported pooled URL with `connection_limit=3&pool_timeout=10` (append with `&` if query parameters already exist). This permits a scheduled advisory-lock connection plus actual work. Budget for API instances (3 x 3), worker (1 x 3), deployments and maintenance headroom. Never disable TLS certificate validation to make connectivity work.
3. Enable APIs: cloudfunctions.googleapis.com, run.googleapis.com, cloudbuild.googleapis.com, artifactregistry.googleapis.com, secretmanager.googleapis.com, cloudscheduler.googleapis.com, logging.googleapis.com, iam.googleapis.com.
4. Create distinct runtime and Scheduler service accounts. Runtime needs access to the named secrets and Firebase Cloud Messaging API Admin (`roles/firebasecloudmessaging.admin`) on the Firebase project. Scheduler gets only `roles/run.invoker` on the private worker. Deployer needs permission to deploy functions, build artifacts, manage Scheduler and act as those accounts. Grant secret access per secret; do not use Owner/Editor for runtime.
5. Provision R2 bucket and restricted object-read/write credentials. Keep private documents private; do not make the whole bucket public. Configure email sender/domain in Resend.
6. Create these Secret Manager secrets: `teen-database-url`, `teen-jwt-secret` (32+ random characters), `teen-r2-access-key`, `teen-r2-secret-key`, `teen-resend-api-key`, `teen-mail-from`. Add their actual values securely, not in repository files or command arguments. The deploy script uses their latest versions; redeploy after rotating environment secrets.
7. Copy `runtime.env.example.yaml` outside the repository, replacing all placeholders with public production settings. `ADMIN_PUBLIC_URL` must be the final HTTPS website origin; CORS origins must match deployed clients. Custom domain setup is an operator step; alternatively deploy initially with the function URL, then update the origin settings and redeploy. Use the returned Cloud Run service URI for a stable origin rather than a URL path containing the function name.

## Prepare and validate the upload bundle

Install local dependencies with the existing lockfiles first. From the repository root:

```bash
node deploy/google/prepare.mjs
cd .deploy/google-functions
npm install --package-lock-only --ignore-scripts
npm ci
```

The preparer builds shared contracts, backend and dashboard. It only copies compiled sources, public frontend assets, Prisma schema/migrations and explicitly allowlisted public CMS fallback data. It does not copy `.env`, private uploads, node_modules, service-account JSON, APKs or the Git repository. The cloud package lock pins resolved deployment dependencies. The packaging manifest excludes contracts development tools and applies patched transitive versions for body-parser, qs, deepmerge-ts and cloudevents/uuid. Keep these overrides until compatible upstream releases absorb the fixes; re-run audit, Prisma generation and HTTP smoke checks when changing them. Generated Prisma binaries come from the cloud install, not a copied developer machine.

The output directory must not already exist: archive/remove only `.deploy/google-functions` when intentionally rebuilding. Do not deploy the raw backend directory because its contracts package uses a sibling path and local credentials could otherwise be uploaded.

`npm ci` runs Prisma generation, not migrations. If Prisma tooling requires datasource env during generation, supply non-secret syntactically valid placeholder PostgreSQL URLs for `DATABASE_URL` and `DIRECT_URL`; actual runtime secrets are only needed when connecting.

Run isolated adapter/worker tests without the normal database-reset test setup:

```bash
cd ../../backend
./node_modules/.bin/vitest run --config vitest.functions.config.ts
```

## Migrate deliberately, then deploy

Back up the target database. Use a trusted operator shell with production `DATABASE_URL` and a direct, non-pooled `DIRECT_URL` loaded securely. Review pending migrations, then from the staged bundle run:

```bash
npm run migrate:deploy
```

Never run `prisma migrate dev`, reset, or seed against production. The deployment script deliberately does not run migrations automatically. Existing media/data must be transferred and verified before switching traffic. Legacy local CMS images in backend/data/content-images are copied into the bundle as read-only fallback; new uploads use R2. Other locally stored identity documents require an explicit private-file migration; no private data is copied automatically.

From the repository root, set public deployment configuration:

```bash
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_REGION=us-central1
export RUNTIME_SERVICE_ACCOUNT=teen-runtime@your-project-id.iam.gserviceaccount.com
export SCHEDULER_SERVICE_ACCOUNT=teen-scheduler@your-project-id.iam.gserviceaccount.com
export RUNTIME_ENV_FILE=/absolute/external/path/runtime.yaml
bash deploy/google/deploy.sh
```

The script deploys API (max 3 instances, concurrency 8, 512 MiB, 120 s) and worker (max 1, concurrency 1, 512 MiB, 540 s), both min instances zero. Only the API allows unauthenticated invocation. It grants Scheduler the worker invoker role and creates/updates the OIDC job. Confirm no existing broad IAM binding grants public access to the worker. Do not expose `teenLifecycle` via the public API/router.

## Launch checks

- Use the API service URI `/api/health` and `/api/v1/health`; confirm dashboard/website assets and deep links work, unauthenticated private API calls return 401/403, and CORS only accepts intended origins.
- Set mobile `API_BASE_URL` and `WEB_BASE_URL` to the final API/web HTTPS origins (check each config's expected prefix); rebuild with `build_apk.sh` after updating the external build settings. Test on a real phone outside the LAN.
- Test a login, QR invite, objective quiz, crossword or matching activity, CMS edit + preview, persistent image reload from another instance, private-file protection, account-deletion request and password verification. Do not purge live users for a smoke test.
- Verify FCM with the runtime service account and verified email delivery; check notification retry/idempotency behavior under retries before broad rollout.
- Confirm the worker rejects unauthenticated calls and the OIDC Scheduler job succeeds. Run it once manually with Scheduler, inspect logs and audit entries, and verify deletion deadlines/holds using test accounts only.
- Check PostgreSQL connections, function error rate/latency, queue backlog, billing alerts and R2 access. Keep the preceding deployment for rollback; database rollback needs a separate reviewed plan.

## Still required from the operator

Google project/billing selection, database/storage/email provisioning, secret values, runtime IAM, reviewed production migration, production domain/DNS, first deployment, and real-device/end-to-end smoke tests. This preparation does not make an unprovisioned service live.

## Local verification completed

Backend TypeScript and dashboard production builds passed. Fifteen isolated function HTTP/worker/storage/media tests passed. A clean staged install generated Prisma Client successfully without connecting to a database. The final staged dependency audit reports zero known vulnerabilities after the documented transitive overrides. The existing dashboard bundle-size warning remains. Cloud IAM, actual database connectivity and delivery providers require live staging verification.
