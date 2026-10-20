# Android built-in Kotlin

This project uses Flutter 3.47+ and AGP 9.1 with `android.builtInKotlin=true`.

The scanner, sharing and device plugins were upgraded to releases supporting built-in Kotlin:

- mobile_scanner 7.4.2
- share_plus 13.3.1
- device_info_plus 13.3.0

Secure storage uses 10.x because the new sharing/device packages require win32 6 on Windows. Stay on 10.x until existing installations have migrated their encrypted preferences; do not jump directly from 9.x to 11.x. The app enables the plugin's migration backup. Verify retained login on an existing Android installation before production rollout.

QR scanning uses the new two-argument error builder, and invite sharing uses `SharePlus.instance.share(ShareParams(...))`.

The legacy Android DSL remains enabled for other plugins (`android.newDsl=false`). This is separate from built-in Kotlin. Other Gradle deprecation messages or pub package-update notices may still appear; they do not by themselves indicate a failed build.

Build a test APK from `mobile_` with `bash build_apk.sh`. Release signing remains separate.

Sources:
- https://docs.flutter.dev/release/breaking-changes/migrate-to-built-in-kotlin/for-app-developers
- https://pub.dev/packages/mobile_scanner/changelog
- https://pub.dev/packages/share_plus/changelog
- https://pub.dev/packages/device_info_plus/changelog
- https://pub.dev/packages/flutter_secure_storage/changelog
