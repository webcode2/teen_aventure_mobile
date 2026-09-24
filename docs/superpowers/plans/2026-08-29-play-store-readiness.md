# Play Store Readiness Implementation Plan (Flutter slice)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Canonical plan:** `docs/superpowers/plans/2026-08-29-platform-production.md` (admin + backend + Flutter). Tasks 1–5 in this file are **done**.

**Goal:** Make the Flutter Android app uploadable to Google Play as a signed App Bundle for teens 13+.

**Architecture:** Release builds hide demo roles and offline download, refuse emulator API hosts, disable cleartext and request logging, and sign from a local `key.properties` file. Store listing copy and legal text live in `docs/`. Play Console clicks stay operator tasks.

**Tech Stack:** Flutter, Android Gradle (Kotlin DSL), Play App Signing / upload keystore, Play Console.

## Global Constraints

- Target SDK 36; package `com.elasctroclud.teen_aventure` unless the owner changes it before first publish.
- Display name `Teen Bible Adventures`.
- 13+ only; no Designed for Families.
- No YouTube downloading.
- Do not commit keystores, `key.properties`, or API secrets.
- Do not commit unless the user asks.

## File map

- Create: `mobile/lib/config/store_config.dart`
- Create: `mobile/lib/screens/legal_screen.dart`
- Create: `mobile/test/store_config_test.dart`
- Create: `mobile/android/key.properties.example`
- Create: `mobile/android/app/proguard-rules.pro`
- Create: `mobile/android/app/src/main/res/xml/network_security_config.xml`
- Create: `mobile/android/app/src/debug/res/xml/network_security_config.xml`
- Create: `mobile/android/app/src/main/res/values/strings.xml`
- Create: `docs/play-store/listing.md`
- Create: `docs/play-store/data-safety.md`
- Create: `docs/play-store/console-checklist.md`
- Create: `docs/legal/privacy-policy.md`
- Create: `docs/legal/terms.md`
- Modify: `mobile/android/app/build.gradle.kts`
- Modify: `mobile/android/app/src/main/AndroidManifest.xml`
- Modify: `mobile/android/app/src/debug/AndroidManifest.xml`
- Modify: `mobile/lib/services/api_client.dart`
- Modify: `mobile/lib/services/video_download_service.dart`
- Modify: `mobile/lib/services/service_locator.dart`
- Modify: `mobile/lib/providers/video_provider.dart`
- Modify: `mobile/lib/screens/home_screen.dart`
- Modify: `mobile/lib/screens/video_learning_screen.dart`
- Modify: `mobile/lib/widgets/stacked_video_card.dart`
- Modify: `mobile/lib/models/game_controller.dart`

---

### Task 1: StoreConfig + tests

- [ ] Add `StoreConfig` with `showDemoRoles`, `showOfflineDownload`, `enableDownloaderPlugin`, `hasRemoteApi`, `quizzesStartUnlocked`.
- [ ] Test the pure helpers (`showDemoRolesFor(isRelease:)`).
- [ ] Run `flutter test test/store_config_test.dart` from `mobile/`.

### Task 2: Release networking and logging

- [ ] Resolve API base URL from `API_BASE_URL`; in release, empty env means no remote API (not `10.0.2.2`).
- [ ] Dio `LogInterceptor` only when `kDebugMode`.
- [ ] Skip `VideoProvider.loadContent` when `!StoreConfig.hasRemoteApi`.
- [ ] Skip `FlutterDownloader.initialize` unless `enableDownloaderPlugin`; never `ignoreSsl: true` in that path for store.

### Task 3: Student-only store UI

- [ ] Release: force `UserRole.student`; hide role switcher and offline tiles.
- [ ] Release: quizzes start unlocked (`kReleaseMode`).
- [ ] Hide download buttons when `!showOfflineDownload`.
- [ ] Profile: Privacy Policy and Terms tiles.

### Task 4: Android Play packaging

- [ ] `targetSdk`/`compileSdk` 36; release signing from `key.properties` if present else debug (local only).
- [ ] R8 minify + `proguard-rules.pro`; native debug symbols `SYMBOL_TABLE`.
- [ ] Launcher label from `@string/app_name`; `usesCleartextTraffic` false; network security configs; debug cleartext allowed.
- [ ] `key.properties.example` + confirm gitignore of `*.jks` / `key.properties`.

### Task 5: Legal + Play Console docs

- [ ] Privacy policy and terms markdown (13+, local data, YouTube third party, no ads).
- [ ] Listing copy, Data safety answers, operator checklist (screenshots, IARC, keystore command, `flutter build appbundle`).

### Task 6: Operator (blocked on you)

- [ ] Generate upload keystore; fill `android/key.properties`.
- [ ] Host legal pages on HTTPS; set Play Console privacy URL.
- [ ] `--dart-define=API_BASE_URL=https://...` and real YouTube URLs.
- [ ] Upload AAB, listing assets, content rating, Data safety, 13+ audience.

---

## Build command (after keystore exists)

```bash
cd mobile
flutter build appbundle --release --dart-define=API_BASE_URL=https://YOUR_PRODUCTION_HOST
```

Output: `mobile/build/app/outputs/bundle/release/app-release.aab`
