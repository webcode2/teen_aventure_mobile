# Welcome & onboarding toggle

Dashboard: App content → Welcome & onboarding → Enabled → Save changes.
The default is enabled, preserving existing behavior and older CMS documents.
Switching off retains the saved title, subtitle and quote in the authoring
content and shows an off state in the dashboard preview.

Publishing writes welcome.enabled to the existing public R2 snapshot. When off,
the public mobile payload also contains empty title/subtitle/quote values so
older app versions with the existing no-content check skip the prompt after
content refresh. Authoring API responses retain the original text; switching on
publishes it again. Public requests still read R2 without database queries.

Mobile source explicitly checks enabled, caches the setting for offline restarts,
notifies listeners when it changes and rechecks before opening the dialog.
The existing seen-once preference is preserved: turning on does not reset a
welcome dialog already seen by that user. Offline clients apply changes after
synchronizing content. The source changes are included in the next mobile build.
