# Run the whole product (admin + API + Flutter)

This repo is one product. Order: database → backend → admin (or `/admin/` static) → Flutter.

## Local

```bash
docker compose up -d
cd backend
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

API: http://127.0.0.1:8080/api/health

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
9. Email (Resend): set `RESEND_API_KEY` from https://resend.com/api-keys. Default `MAIL_FROM` is the sandbox `ASK Hub <onboarding@resend.dev>` (delivers only to the Resend account email). For production, verify a domain and set `MAIL_FROM` to an address on that domain. Optional `RESEND_WEBHOOK_SECRET` if you add delivery webhooks. Without `RESEND_API_KEY`, emails stay `PENDING` in `GET /api/admin/notifications`. Twilio vars are still optional for SMS.
10. Push (FCM, Android first): create a Firebase project, add an Android app with package `com.elasctroclud.teen_aventure`, and enable Cloud Messaging. Put the service-account JSON in backend `FIREBASE_SERVICE_ACCOUNT_JSON` (one line) or `GOOGLE_APPLICATION_CREDENTIALS` (file path). Do not commit that JSON. Pass the web/client values into Flutter with `--dart-define=FIREBASE_API_KEY=... --dart-define=FIREBASE_APP_ID=... --dart-define=FIREBASE_MESSAGING_SENDER_ID=... --dart-define=FIREBASE_PROJECT_ID=...`. Optional: drop `google-services.json` in `mobile/android/app/` (Gradle applies the plugin only if that file exists). Without the service account, push rows stay `PENDING` in the outbox. iOS can wait.

### Backups (operator)

Postgres is the source of truth. Take daily dumps and keep them off the app host:

```bash
pg_dump "$DATABASE_URL" -Fc -f "askhub-$(date +%Y%m%d).dump"
```

Restore only onto a staging database first. Safeguarding rows may outlive a family deletion request until an investigation closes.

## Content path

Admin **Save BIY week** → `POST /api/admin/biy-weeks` → Flutter `GET /api/hub/biy/weeks` → YouTube player.

Sample URLs in `mobile/lib/data/youtube_lesson_urls.dart` are only the offline/sample path when the API is not configured.
