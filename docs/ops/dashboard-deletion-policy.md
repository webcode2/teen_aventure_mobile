# Dashboard deletion and archive

Dashboard **Delete** permanently removes the selected resource. It does not create an archive entry or offer a recovery window. Account, household and ministry deletions run the existing purge cleanup in the same serializable transaction as request validation. A blocked cleanup rolls back the entire operation. Password verification, permissions, self-account protection, the final operations-admin check and safeguarding retention still apply.

| Action | Result |
| --- | --- |
| Dashboard Delete account (including staff) | Immediate permanent account cleanup, including dependent account resources |
| Dashboard Delete household | Immediate permanent cleanup of the owning account and its dependent household resources |
| Dashboard Delete ministry | Immediate permanent cleanup of ministry groups and exclusive staff; shared personal accounts remain |
| Dashboard Delete completely now from deletion queue/archive | Immediate permanent cleanup; removed from archive too |
| Delete quest week, CMS page, puzzle/match draft or eligible published version | Direct permanent removal; existing attachment/dependency checks apply |
| Remove device token, membership or assignment | Remove that token/link; does not delete the person |
| Explicit Move to archive (rejected application or existing deleted account/ministry) | Administrative filing; not permanent deletion |
| User-requested account/ministry deletion | Existing 30-day recovery and 90-day purge process |

A sanitized purge receipt retains anonymous counts for operational auditing, with no user IDs or snapshot and no archive flag. Private identity files use the existing asynchronous storage-cleanup worker; a scrubbed cleanup marker exists until removal succeeds. This does not preserve a recoverable account.

Previously deleted or archived production records are not bulk-purged by deploying this change. An explicit dashboard deletion is required.

Validation: `npm run test:deletion` creates a fresh randomly named test schema, tests account/ministry cleanup, permissions, retention rollback and user recovery, then removes only that schema. It never runs seeds or resets the production database.

## Archived identities and email reuse

Archiving moves original User/Child emails into indexed admin-only `archivedEmail` fields and releases the unique login addresses. User credentials are disabled; password reset/verification tokens are revoked. Public deletion-status and recovery credential verification rejects archived identities. Existing account-deletion scoping also excludes archived members from mobile group access and standings.

Adult, teen, ministry-applicant and dashboard-created registrations can reuse an archived email. They create independent accounts with `registeredWithArchivedEmail=true`, which appears only in admin directory/detail responses and UI. Public login/registration payloads do not return archive data or this review flag. The flag remains on the new account even after the old archive is purged.

Restoring an archived account requires its original address to be free. If reused, restoration returns a conflict and rolls back; it never merges accounts or grants access to the new identity. Email reuse does not imply the new person is the previous account owner.

Migration `20261022133000_archive_email_re_registration` adds the fields/indexes, moves already archived addresses out of login columns, and revokes old archived credentials. No account or ministry records are deleted by this migration.

## Deployment verification

Applied locally and in Neon on 2026-10-22. API revision `teen-api-00010-rul`; lifecycle revision `teen-lifecycle-00002-tuj`; Cloudflare version `df5e70e5-5a5f-4451-86e1-9fed36039e76`. Backend isolated integration suite: 26 passing. Dashboard directory/archive tests: 7 passing. Production read-only checks found zero archived-login isolation violations and zero archived child login emails still reserved. API health returned 200; unauthenticated archive access returned 403. No production registration or account deletion was performed during verification.
