# Cloudflare frontend and published content plan

Goal: ordinary public pages must not read Neon, and the frontend must be hosted on Cloudflare. Keep the Prisma/PostgreSQL API and private data on Google/Neon.

1. Deploy the Vite build using Cloudflare static assets and a small same-origin Worker router.
2. Route only public CMS reads (`/api[/v1]/content/web`, `/content/mobile`, `/site-pages`, `/site-pages/:slug`) to a public-only R2 snapshot. Do not fall back to the database on missing snapshots or missing slugs.
3. Keep authoring content and unpublished pages in Neon. On successful CMS/site-page mutations, replace one atomic R2 snapshot under a cross-instance publishing lock. Never include drafts, users, identity files, tokens, scores or other private data.
4. Read the atomic snapshot directly from R2 with revalidation. Cloudflare public reads are independent of both Google runtime and Neon; the legacy Google cache is bounded to 30 seconds.
5. Proxy other `/api` routes to the existing Google origin without caching. Forward Set-Cookie without adding a Domain attribute, preserving Secure/HttpOnly/Strict browser sessions at the Cloudflare origin.
6. Remove duplicate frontend public-content fetches with a shared in-flight request; public responses omit credentials. Keep fresh authenticated admin reads separate.
7. Publish the initial snapshot from production's existing public data (not a database seed script), verify public/private separation and no-database request paths, then update production origins and deploy both sides.
8. Verify Cloudflare static routes, snapshot version changes, unpublish/delete, API cookie login and non-caching of authenticated requests. Keep Google as a rollback origin until checks pass.

Cloudflare Worker deployment authentication is required in addition to R2 object credentials. No Cloudflare deployment token is currently configured.

Implementation choice: one atomic R2 object replaces the separate manifest/version files. Cloudflare revalidates public responses and reads R2 directly, giving immediate publish/unpublish visibility without a stale edge cache. The legacy Google cache is bounded to 30 seconds.

Cost constraint: target $0 for the public site. Static assets have no request or
storage charge. Worker public reads and API proxy calls share the Free plan's
100,000/day quota. R2 Standard allowances are shared account-wide: 10 GB-month,
10 million reads and 1 million writes/month. R2 is metered above its allowance;
this architecture does not impose a hard billing cap. No paid Workers plan was
requested or enabled. Wrangler OAuth cannot read account billing subscriptions.
Google API, builds, storage, database and email are separate from static hosting.

Deployment (2026-10-21): frontend URL
https://teen-adventures-web.saviorisrael.workers.dev, Worker `teen-adventures-web`,
version `5f96dd97-6138-4a57-a89d-0b3687ad5b56`, public R2 binding only.
Initial snapshot contains web/mobile public copy and three published pages.
Google API revision `teen-api-00004-tar` enabled snapshot reads. Origin/reset-link
configuration is being updated to Cloudflare, preserving the Google origin.
Origin update completed: API revision `teen-api-00005-xoc`; new password-setup
emails point to the Cloudflare frontend. Existing Google links remain usable.

Live acceptance passed through the Cloudflare URL: secure staff cookie login,
7-day expiry, session restore, protected library access, tampered-cookie rejection,
CSRF enforcement, logout, draft exclusion, publication, immediate unpublication,
temporary page deletion, applicant login and private R2 multipart upload with byte
verification. Temporary accounts, page and uploaded object were removed.
Public content responses report `X-Content-Source: r2`; private API responses use
`Cache-Control: private, no-store`. Existing local records were untouched.

Domain follow-up: public origin is https://tba.elastrocloud.com and staff origin
is https://admin.tba.elastrocloud.com. Both are recorded in local deployment target
files. Public admin footer links were removed. Staff frontend paths return 404
on the public Cloudflare hosts. User opted out of Cloudflare Access configuration;
normal staff authentication still protects operations, and the admin login is
publicly reachable. See private-admin-host-plan.md for the exact protection scope.

Refresh fix: old public-host staff URLs now redirect to the admin hostname rather than returning 404. Nested paths and query parameters are preserved. Admin SPA fallback handles direct loads and refreshes.
