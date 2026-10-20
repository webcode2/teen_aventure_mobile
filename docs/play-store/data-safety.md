# Play Console Data safety — draft inventory

The old “no accounts / on-device only” answers are obsolete. **Do not paste this draft into Play Console without reviewing the production build, backend, SDKs and actual operating practices.** Local-only storage is not itself off-device collection.

| Data surface identified in source | Purpose to verify | Declaration work required |
| --- | --- | --- |
| Account name, email, credentials and profile fields such as birth year, phone, biography/avatar where enabled | Authentication, account/profile management | Identify required/optional fields, protection, retention and deletion |
| Family/child relationships and group/ministry membership | Family supervision and group functionality | Explain visibility and permissions; assess sensitive religious-affiliation implications |
| Lesson/quiz progress, scores and activity | Learning, progress and standings | Map to app activity and other applicable Console categories |
| FCM registration token and device manufacturer/model/name | Notification registration and delivery | Map identifiers/device data and service-provider processing |
| Reports and submitted support/content information | Support and moderation | Inspect payloads and retention; classify user-submitted content |
| Embedded YouTube player and other network SDK behavior | Lesson video playback and app services | Inventory each provider's actual collection/sharing and audience compatibility |

No AD_ID, location, microphone or broad storage permission was observed in the inspected APK. This does not establish that SDKs collect no identifiers or other data. Camera access supports scanning; inspect the production scanning flow before claiming that images never leave the device.

Confirm all production recipients, processors and purposes, whether each transfer is collection/sharing under Google's definitions, encryption in transit, optionality, retention, and applicable exceptions. SDK behavior and operational logging must be included.

Account deletion and recovery are now implemented through the public `/delete-account` page and the app webview, with password verification, the 30/90-day lifecycle, admin archive/immediate-purge decisions and retention checks. See `docs/ops/account-deletion.md`. Before claiming production availability, deploy the page/API, configure the scheduled lifecycle function, and verify the public URL and device flow.

See [the current audit](audit-2026-10-18.md) and [Google's User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311).
