# Play Console operator checklist

Read [the current readiness audit](audit-2026-10-18.md). The app is not yet ready to submit.

## Release preparation

- [ ] Confirm package ID `com.elasctroclud.teen_aventure` against the Play app before first upload; preserve existing identity.
- [ ] Restore/configure the correct upload keystore in `mobile_/android/key.properties`. Keep passwords and keystores out of Git. Release tasks now fail when signing is absent; do not use a debug key.
- [ ] Set an unused version code in `mobile_/pubspec.yaml`.
- [ ] Verify the production HTTPS API and dashboard-controlled legal pages from an external network. The source default is not an offline sample-only release.
- [x] Implement personal/ministry deletion, password verification, recovery, archive handling and backend purge/retry. See `docs/ops/account-deletion.md`.
- [ ] Deploy the deletion page/API and scheduled lifecycle function; verify the external request URL and real-device webview.
- [ ] Replace obsolete privacy disclosures; review `data-safety.md` against the final app and SDK inventory.
- [ ] Resolve the audience mismatch between child-profile support and the 13+ listing. Assess Families requirements before choosing Console age groups.
- [ ] Build from `mobile_/` with `flutter build appbundle --release --dart-define=API_BASE_URL=https://VERIFIED_PRODUCTION_HOST`.
- [ ] Verify the signed artifact at `mobile_/build/app/outputs/bundle/release/app-release.aab`, certificate, version, permissions and native alignment. Target SDK is 36.

## Console and testing

- [ ] Developer verification and app setup complete.
- [ ] Accurate listing, screenshots, 512px icon and 1024×500 feature graphic.
- [ ] App access instructions and valid review credentials for restricted flows.
- [ ] Public privacy and account-deletion URLs; accurate Data safety answers.
- [ ] Target audience, content rating, ads and other applicable app-content declarations match actual behavior.
- [ ] Internal testing first; complete any account-specific testing requirement shown in Console.
- [ ] Physical low-end-device performance, offline/cold start, notification/camera denial, webview, accessibility and account-deletion tests pass.
- [ ] Test the final bundle on 16 KB Android and Android 15/16 devices, including edge-to-edge insets and back navigation.
- [ ] Review pre-launch report and Android vitals before promoting to production.
