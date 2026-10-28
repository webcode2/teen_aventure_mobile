#!/usr/bin/env bash
set +x
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.."
node --input-type=module -e '
  import fs from "node:fs";
  const target = JSON.parse(fs.readFileSync("deploy/google/target.json", "utf8"));
  if (target.database !== "postgresql" || target.orm !== "prisma" || target.runtimeDatabase !== "postgresql") {
    console.error("Deployment blocked: this function deploys the Prisma PostgreSQL API.");
    process.exit(1);
  }
'
: "${GOOGLE_CLOUD_PROJECT:?Set GOOGLE_CLOUD_PROJECT}"
: "${RUNTIME_SERVICE_ACCOUNT:?Set RUNTIME_SERVICE_ACCOUNT email}"
: "${SCHEDULER_SERVICE_ACCOUNT:?Set SCHEDULER_SERVICE_ACCOUNT email}"
: "${RUNTIME_ENV_FILE:?Set RUNTIME_ENV_FILE to a completed external YAML file}"
node deploy/google/preflight.mjs
command -v gcloud >/dev/null || { echo "Install the Google Cloud CLI and sign in before deploying." >&2; exit 1; }
region="${GOOGLE_CLOUD_REGION:-europe-southwest1}"
scheduler_region="${GOOGLE_SCHEDULER_REGION:-europe-west1}"
source_dir="${FUNCTION_SOURCE_DIR:-$PWD/.deploy/google-functions}"
[[ -f "$source_dir/package-lock.json" ]] || { echo 'Prepare the source and generate its package lock first.' >&2; exit 1; }
# Secret names only. Provision values with Secret Manager before deploying.
secrets='DATABASE_URL=teen-database-url:latest,JWT_SECRET=teen-jwt-secret:latest,R2_ACCESS_KEY_ID=teen-r2-access-key:latest,R2_SECRET_ACCESS_KEY=teen-r2-secret-key:latest,RESEND_API_KEY=teen-resend-api-key:latest,MAIL_FROM=teen-mail-from:latest'
common=(--gen2 --project="$GOOGLE_CLOUD_PROJECT" --region="$region" --runtime=nodejs22
  --source="$source_dir" --trigger-http --service-account="$RUNTIME_SERVICE_ACCOUNT"
  --env-vars-file="$RUNTIME_ENV_FILE" --set-secrets="$secrets" --min-instances=0
  --set-build-env-vars=GOOGLE_NODE_RUN_SCRIPTS= --memory=512Mi --cpu=1)
gcloud functions deploy teen-api "${common[@]}" --entry-point=teenApi --allow-unauthenticated --max-instances=3 --concurrency=8 --timeout=120s
gcloud functions deploy teen-lifecycle "${common[@]}" --entry-point=teenLifecycle --no-allow-unauthenticated --max-instances=1 --concurrency=1 --timeout=540s
worker_url="$(gcloud functions describe teen-lifecycle --gen2 --project="$GOOGLE_CLOUD_PROJECT" --region="$region" --format='value(serviceConfig.uri)')"
worker_service="$(gcloud functions describe teen-lifecycle --gen2 --project="$GOOGLE_CLOUD_PROJECT" --region="$region" --format='value(serviceConfig.service)')"
gcloud run services add-iam-policy-binding "${worker_service##*/}" --project="$GOOGLE_CLOUD_PROJECT" --region="$region" --member="serviceAccount:$SCHEDULER_SERVICE_ACCOUNT" --role=roles/run.invoker
job=(--project="$GOOGLE_CLOUD_PROJECT" --location="$scheduler_region" --schedule="${LIFECYCLE_SCHEDULE:-*/30 * * * *}" --time-zone=UTC
  --uri="$worker_url" --http-method=POST --oidc-service-account-email="$SCHEDULER_SERVICE_ACCOUNT"
  --oidc-token-audience="$worker_url" --attempt-deadline=540s --max-retry-attempts=2)
if gcloud scheduler jobs describe teen-lifecycle --project="$GOOGLE_CLOUD_PROJECT" --location="$scheduler_region" >/dev/null 2>&1; then
  gcloud scheduler jobs update http teen-lifecycle "${job[@]}"
else
  gcloud scheduler jobs create http teen-lifecycle "${job[@]}"
fi
