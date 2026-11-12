# Set up the project on another computer

The whole product (website, dashboard, mobile app, deploy scripts) is in
`webcode2/teen_aventure_mobile`. The API is a git submodule at `backend/`,
from `webcode2/teen-aventure-backend`. On both repos, `main` holds the latest work.

## 1. Get the code

```bash
git clone --recurse-submodules https://github.com/webcode2/teen_aventure_mobile.git
```

Already cloned without the backend? Run this inside the folder:

```bash
git submodule update --init
```

## 2. Copy the secret files privately

These are not in git on purpose. Copy them by USB or an encrypted archive,
never through GitHub, chat or email.

| File | What it is |
|---|---|
| `backend/.env` | Database URL, JWT secret, API keys |
| `admin/.env.local`, `admin/.env.production`, `admin/.env.development.local` | Dashboard settings |
| `mobile_/.env` | App settings |
| `mobile_/android/key.properties` + the keystore it names (`storeFile`, kept outside the repo) | Android signing key. Without it, updates can't be published to the same Play Store app. Back it up. |
| `mobile_/android/app/google-services.json` | Firebase config for push notifications |
| `backend/private-uploads/` | Uploaded ministry ID documents (private data) |

Optional, only if needed:

- `backend/.db-backups/`: production database dumps (private user data).
- `deploy/cloudflare/wrangler.generated.json`: regenerate it with `node prepare.mjs` instead (see `deploy/cloudflare/README.md`).

After copying `key.properties`, update its `storeFile` path to where the keystore lives on the new computer.

## 3. Install dependencies

```bash
cd contracts && npm install
```

```bash
cd admin && npm install
```

```bash
cd backend && npm install && npx prisma generate
```

```bash
cd mobile_ && flutter pub get
```

Builds, APKs, `node_modules` and `.deploy/` are recreated by these steps and the
build commands; don't copy them.

## 4. Run it

See [runbook.md](runbook.md).

## Pitfall

Don't delete a folder while a terminal is inside it. The prompt keeps showing the
old path and every command fails. Run `cd` to a folder that exists to recover.
