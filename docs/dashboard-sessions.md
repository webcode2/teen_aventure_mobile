# Dashboard browser sessions

Staff sign-in uses `/api/auth/login` with `surface: "dashboard"`. It returns user
and expiry metadata, and sets a server-signed session cookie. It does not return
a bearer token. Staff credentials and user profiles are no longer persisted in
localStorage; legacy staff storage keys are removed. Existing dashboard users
must sign in again after this migration. Mobile and ministry bearer sessions
continue to work independently.

Cookie policy is controlled by the **backend** `NODE_ENV`:

| Environment | Cookie name | Attributes |
| --- | --- | --- |
| `production` | `__Host-askhub_dashboard` | Secure, HttpOnly, SameSite=Strict, Path=/ |
| development/test | `askhub_dashboard_dev` | HttpOnly, SameSite=Strict, Path=/ |

Both expire seven days after login. Activity does not renew the session. The
production cookie has no Domain attribute. Keep the dashboard and API on the
same site (prefer the existing same-origin `/api` deployment/proxy); cross-site
API hosts will not receive a Strict cookie. Production must serve HTTPS. Local
Vite's HTTP proxy remains supported without weakening production cookies.

The UI restores user/expiry metadata through `GET /api/auth/dashboard-session`
on refresh and signs out through `POST /api/auth/dashboard-logout`, which expires
the HttpOnly cookie. Cookie-authenticated writes, dashboard login, and logout
require `X-Dashboard-Request: 1`. Credentialed CORS permits that header only for
configured origins in production. Login/session/logout responses use no-store.

The server verifies the signature and expiry and checks the current account
status/role. Dashboard cookies have a distinct JWT audience and are rejected as
bearer tokens. Changing local UI state or modifying a cookie cannot grant a new
identity or role: tampered signatures are rejected. HttpOnly blocks page scripts
from accessing the cookie; it does not prevent the browser owner from editing
or deleting their own cookies through developer tools. Logout removes the
browser's cookie; it does not revoke an independently copied JWT before expiry.
