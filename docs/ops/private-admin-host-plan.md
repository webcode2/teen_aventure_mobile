# Separate admin hostname

Public site: https://tba.elastrocloud.com
Admin: https://admin.tba.elastrocloud.com

The public frontend omits both Admin Dashboard footer links. Cloudflare redirects `/app/login`, `/app/forgot`, `/app/reset`, `/app/dashboard` and dashboard
subpaths from the public hostname and workers.dev hostname to the admin hostname, preserving paths and query parameters. The admin root redirects
to `/app/dashboard`, where the existing authentication guard opens login when needed.

User chose to skip Cloudflare Access after the additional token requirement.
No Access application, policy or subscription was created. The admin login page
is publicly reachable; authenticated staff roles and secure HttpOnly cookies protect
the dashboard data. This is URL separation, not a private network or email allowlist.
The Google fallback origin still has normal staff authentication. Do not describe
this deployment as Cloudflare Access protected or restricted to Gmail reviewers.

`deploy/cloudflare/target.json` records both hostnames. `prepare.mjs` retains both
custom domains, the public R2 binding, and the Worker routing rules on deployment.
`DASHBOARD_PUBLIC_URL` selects the admin origin for staff reset/setup emails;
`ADMIN_PUBLIC_URL` continues to point to the public site for ministry links.
CORS includes the admin origin, public origin and existing fallback origins.

Local development uses the existing Vite/API servers over HTTP and requires no
Cloudflare Access. An empty DASHBOARD_PUBLIC_URL falls back to ADMIN_PUBLIC_URL.
The private Access JWT experiment was removed after the user opted out.

If stronger isolation is requested later, protect the entire admin hostname with
Cloudflare Access and validate its signed audience/issuer JWT at the Google API
for staff operations so the direct origin cannot bypass it. Use a specific reviewer
allowlist if the goal is privacy; allowing all Gmail accounts is a broad outer gate.
