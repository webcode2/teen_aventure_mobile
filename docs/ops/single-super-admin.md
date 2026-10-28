# Single dashboard owner

Roles are Super Admin (one owner), Super Editor, and Editor. App Manager is retired and grants no dashboard authority. The old database enum label remains only to keep historical migrations compatible; no API or UI assignment accepts it.

The role migration preserves accounts and active/disabled state. It chooses elastrocloud@gmail.com as owner when present, falling back to the previous manager for local installations. Other legacy App Managers/Super Admins become Super Editors. A partial unique index enforces at most one Super Admin, including inactive accounts. Standard account editing cannot transfer ownership, demote the owner, or create another owner.

Staff invitation options contain only Editor and Super Editor. Invitations enqueue a one-use, 48-hour password-setup link; no plaintext password is emailed. Resending invalidates previous setup links. Revoking staff access blocks existing sessions on the next request and invalidates pending setup links. Roles are loaded from the database for every authenticated request, so reducing a role applies even to an existing cookie/token.

Use `ROLE_TEST_ONLY=1 npm run test:deletion` from backend for migration, singleton, invitation, and access checks in a fresh temporary database schema. No real invitations are delivered by those tests.

Deployed 2026-10-22: API `teen-api-00011-vim`, Cloudflare `3a9447f9-77da-4e4b-890b-3189bd5e2a22`. Local and Neon verification: one active Super Admin each; zero App Managers; production owner is elastrocloud@gmail.com. Six isolated role/invitation tests, 26 deletion/archive regression tests and seven frontend tests passed. Builds passed; live API health returned 200. No real staff invitation was sent during verification.
