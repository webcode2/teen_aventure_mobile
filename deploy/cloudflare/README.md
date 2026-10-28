# Cloudflare frontend and public content

The static React build runs on Cloudflare Workers Static Assets. The Worker reads
public CMS data directly from the public R2 bucket; other `/api/*` requests proxy
to Google without caching. Secure host-only cookies stay on the Cloudflare host.
No database credentials or private bucket binding belong in this Worker.

1. Build `admin` with `VITE_API_BASE` empty (same origin).
2. Authenticate with `XDG_CONFIG_HOME=/tmp/teen-cloudflare-config ./node_modules/.bin/wrangler login`.
3. Set non-secret `CLOUDFLARE_ACCOUNT_ID` and `PUBLIC_CONTENT_BUCKET`, then run
   `node prepare.mjs` and `npm test` from this directory.
4. Publish existing public content once using backend `publishPublicContent(true)`
   with the production database and R2 configuration. Never run a seed.
5. Enable `PUBLISH_PUBLIC_SNAPSHOTS=true` in the production API environment and
   deploy the API. Admin saves then publish the latest public state to R2.
6. Run `XDG_CONFIG_HOME=/tmp/teen-cloudflare-config npm run deploy`.
7. Set API `ADMIN_PUBLIC_URL` to the resulting HTTPS origin, and add that origin to
   `CORS_ORIGINS`, preserving the Google origin during transition. Redeploy API.
8. Check login/logout, public pages, publish/unpublish and private uploads before
   switching links. Keep the Google frontend available for rollback.

Publication uses a PostgreSQL advisory transaction lock to serialize publishers
across API instances and a single atomic R2 object replacement. The snapshot
contains only public platform copy and SitePage rows selected with published=true.
No public request falls back to Neon when a snapshot is missing: it returns 503.
Cloudflare public responses revalidate and read R2 on every request; no database
connection is required. Google’s legacy public content cache lasts up to 30 seconds.
Database writes and R2 writes cannot share an atomic commit: if R2 publication fails,
the API reports “Changes saved, but public publication failed” and the editor must
retry saving. Existing public content remains available until publication succeeds.

Production custom domain: `tba.elastrocloud.com`. The hostname is saved in
`target.json` so subsequent deployments retain it. Set `FRONTEND_HOSTNAME` to
explicitly override that value when running `node prepare.mjs`. The `workers.dev` URL remains
available during transition. Cloudflare manages the custom domain DNS and TLS.

Staff operations use `admin.tba.elastrocloud.com`, also saved in `target.json`.
The public host redirects staff frontend pages to the admin hostname. The admin root opens the
staff dashboard/login. Cloudflare Access is not enabled: the existing app login
and role checks protect data, while the login page remains publicly reachable.
`ADMIN_HOSTNAME` can override the configured admin hostname at preparation time.
Set API `DASHBOARD_PUBLIC_URL` to the admin HTTPS origin for staff reset emails;
keep `ADMIN_PUBLIC_URL` on the public hostname for ministry links.
