# Run the whole product (admin + API + Flutter)

This repo is one product. Order: database → backend → admin (or `/admin/` static) → Flutter.

New computer? Start with [new-computer-setup.md](new-computer-setup.md).

## Local

Preferred laptop stack (Postgres + API in Docker):

```bash
docker compose -f deploy/docker-compose.local.yml up -d --build
cd backend
npx prisma migrate deploy   # or: npx prisma db push
npx prisma db seed
```

- Postgres: `127.0.0.1:5433` databases `teen` (app) and `teentest` (vitest)
- API: http://127.0.0.1:8080/api/health
- Identity docs: `PRIVATE_UPLOAD_DRIVER=local` → `backend/private-uploads/`

Host-run API instead of the container (keep Docker Postgres only):

```bash
docker compose -f deploy/docker-compose.local.yml up -d postgres
cd backend && npm run dev
```

On Windows, use `127.0.0.1` not `localhost`. Docker Desktop binds IPv6 `::1:8080`, so Chrome `localhost` never reaches Fastify.

Create an App Manager (optional, before seed):

```
BOOTSTRAP_ADMIN_EMAIL=you@church.org
BOOTSTRAP_ADMIN_PASSWORD=choose-a-strong-password
```

in `backend/.env`, then re-run `npx prisma db seed`.

Admin hot reload:

```bash
cd admin
npm run dev
```

Vite talks to the API; leave `CORS_ORIGINS` empty so Fastify reflects the Vite origin.

Same-origin admin (production shape):

```bash
cd admin && npm run build
# restart backend — serves admin/dist at http://localhost:8080/admin/
```

Flutter (debug Chrome): launch **Flutter Chrome** (port 7357). Student UI uses sample data if the API is down.

Flutter (Play AAB):

```bash
cd mobile
flutter build appbundle --release --dart-define=API_BASE_URL=https://YOUR_API_HOST --dart-define=FIREBASE_API_KEY=YOUR_KEY --dart-define=FIREBASE_APP_ID=YOUR_APP_ID --dart-define=FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER --dart-define=FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
```

## Production

The API refuses to start when `NODE_ENV=production` and `JWT_SECRET` is shorter than 32 characters.

1. Hosted Postgres → `DATABASE_URL`
2. Set `NODE_ENV=production` and `JWT_SECRET` to at least 32 random characters
3. `CORS_ORIGINS=https://YOUR_ADMIN_HOST` if the admin is on another host; empty/same-origin if admin is `/admin/`
4. TLS terminator in front of Fastify (`0.0.0.0:8080`)
5. `cd admin && npm run build` then start the API so `/admin/` is served
6. Publish BIY weeks in admin (YouTube URLs)
7. Point the AAB at the same HTTPS API
8. Play Console: `docs/play-store/console-checklist.md`
9. Email (Resend): set `RESEND_API_KEY` from https://resend.com/api-keys. Default `MAIL_FROM` is the sandbox `Teen Bible Adventures <onboarding@resend.dev>` (delivers only to the Resend account email). For production, verify a domain and set `MAIL_FROM` to an address on that domain. Optional `RESEND_WEBHOOK_SECRET` if you add delivery webhooks. Without `RESEND_API_KEY`, emails stay `PENDING` in `GET /api/admin/notifications`. Device alerts use FCM. The app does not send SMS.
10. Push (FCM, Android first) — get values from [Firebase Console](https://console.firebase.google.com/):

   1. Create or open a project (same one for API + app).
   2. Project settings (gear) → **General** → **Your apps** → **Add app** → Android.  
      Package name: `com.elasctroclud.teen_aventure`. Register the app.
   3. From that Android app card, copy into Flutter `--dart-define` / `mobile_/.env.example`:
      - **API Key** → `FIREBASE_API_KEY`
      - **App ID** (`1:…:android:…`) → `FIREBASE_APP_ID`
      - **Sender ID** (also under Cloud Messaging) → `FIREBASE_MESSAGING_SENDER_ID`
      - **Project ID** → `FIREBASE_PROJECT_ID`
   4. Optional: download `google-services.json` into `mobile_/android/app/` (Gradle applies the plugin only if the file exists).
   5. Project settings → **Service accounts** → **Generate new private key**.  
      Put the JSON in backend `FIREBASE_SERVICE_ACCOUNT_JSON` as **one line**, or save the file and set `GOOGLE_APPLICATION_CREDENTIALS` to its path (plus `FIREBASE_PROJECT_ID`). Do not commit that JSON.
   6. Ensure Cloud Messaging is enabled (Build → **Messaging**, or the Cloud Messaging API in Google Cloud for the same project).

   Example Flutter run:

   ```bash
   flutter run \
     --dart-define=FIREBASE_API_KEY=... \
     --dart-define=FIREBASE_APP_ID=... \
     --dart-define=FIREBASE_MESSAGING_SENDER_ID=... \
     --dart-define=FIREBASE_PROJECT_ID=...
   ```

   Without the service account, push rows stay `PENDING` in the outbox. iOS can wait.

### Backups (operator)

Postgres is the source of truth. Take daily dumps and keep them off the app host:

```bash
pg_dump "$DATABASE_URL" -Fc -f "askhub-$(date +%Y%m%d).dump"
```

Restore only onto a staging database first. Safeguarding rows may outlive a family deletion request until an investigation closes.

### Private identity documents (local vs R2)

`PRIVATE_UPLOAD_DRIVER` in `backend/.env`:

| Value | Behavior |
|-------|----------|
| `auto` (default) | **Development:** `backend/private-uploads/` via multipart. **Production:** Cloudflare R2. |
| `local` | Always local disk. Rejected when `NODE_ENV=production`. |
| `r2` | Always R2. Requires the `R2_*` credentials below (use this to exercise R2 on a laptop). |

R2 credentials (required for `r2` and for production `auto`):

- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`

Apply form flow:

1. `GET /api/church-applications/identity-doc/storage` → `{ storage, directUpload }`
2. If `directUpload` (R2): `POST …/identity-doc/presign` then browser `PUT` to the URL
3. If local: `POST …/identity-doc` multipart → disk under `backend/private-uploads/`

R2 bucket CORS for the admin origin:

- Allowed methods: `PUT`, `GET`, `HEAD`
- Allowed headers: `Content-Type`
- Max age: `3600`

Care opens files via admin `POST /api/admin/church-applications/:id/identity-doc-url`
(presigned GET on R2, or streamed from local disk).

## Content path

Admin **Save BIY week** → `POST /api/admin/biy-weeks` → Flutter `GET /api/hub/biy/weeks` → YouTube player.

Sample URLs in `mobile/lib/data/youtube_lesson_urls.dart` are only the offline/sample path when the API is not configured.
