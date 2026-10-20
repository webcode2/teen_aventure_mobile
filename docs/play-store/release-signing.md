# Android release signing

The app retains package ID `com.elasctroclud.teen_aventure` and its existing upload keystore. Never replace that key merely to resolve a password mismatch.

`mobile_/android/key.properties` points to the private signing configuration outside the repository. Password values use Java properties syntax (no surrounding quotes). The configured password must match the existing keystore; build changes cannot recover a forgotten password.

From `mobile_`, build a test APK without needing the upload password:

```bash
bash build_apk.sh
```

The test APK is `build/app/outputs/flutter-apk/app-debug.apk`, also copied to the mobile project root with its app name and version. It uses Android debug signing and cannot be submitted to Play. Installing it over an app signed with a different key fails; uninstalling the old app removes its local data.

For release builds:

```bash
bash tool/build_signed_release.sh appbundle
# Or, for a release APK:
bash build_apk.sh --release
```

Release mode automatically loads the saved signing settings from `android/key.properties` and environment overrides. If validation fails in an interactive terminal, it prompts without echoing passwords, then validates the keystore and private key before Flutter compilation, and passes credentials only through the child process environment. It does not save passwords or modify the keystore. Existing `key.properties` still supplies the path and alias. Close the terminal after use if desired; the script does not export credentials to its parent shell.

Local builds and CI may override individual signing fields using `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, and optional `ANDROID_KEYSTORE_TYPE` (`PKCS12` or `JKS`). Environment values take precedence over `key.properties`; do not put passwords in command arguments, logs, or version-controlled files. Keep all four required values configured. Debug builds do not require release credentials.

Release builds validate the store password, private-key alias and key password before task execution. Failures identify which setting needs attention without exposing credentials. If the correct password is unavailable, restore the original credentials from your password manager/backup. A Play upload-key reset, if needed for an existing listing, is a separate operator action.
