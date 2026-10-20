#!/usr/bin/env bash
# Local test APK by default; release credentials stay outside this script.
set +x
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
artifact="${1:-apk}"
if [[ "$artifact" != appbundle && "$artifact" != apk ]]; then
  echo 'Usage: bash tool/build_signed_release.sh [apk|appbundle] [--release|--debug] [Flutter build options...]' >&2
  exit 2
fi
if [[ $# -gt 0 ]]; then shift; fi
mode=debug
if [[ "$artifact" == appbundle ]]; then mode=release; fi
options=()
for option in "$@"; do
  case "$option" in
    --release) mode=release ;;
    --debug) mode=debug ;;
    --profile) echo 'Use --debug for testing or --release for upload signing.' >&2; exit 2 ;;
    *) options+=("$option") ;;
  esac
done
if [[ "$mode" == debug ]]; then
  echo 'Building a test artifact with the Android debug signing key.'
  flutter build "$artifact" --debug "${options[@]}"
  exit
fi
trap 'unset ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_PASSWORD' EXIT
# Gradle loads path, alias and passwords from android/key.properties automatically.
# Existing environment overrides take precedence. Never source Java properties as shell code.
if ! (cd android && ./gradlew :app:validateSigningRelease --no-daemon --console=plain); then
  if [[ ! -t 0 ]]; then
    echo 'Signing validation failed. Correct android/key.properties or the ANDROID_KEYSTORE_* environment settings.' >&2
    exit 1
  fi
  echo 'Saved signing settings failed validation. Enter the correct passwords to retry.'
  read -r -s -p 'Existing upload keystore password: ' ANDROID_KEYSTORE_PASSWORD
  printf '\n'
  if [[ -z "$ANDROID_KEYSTORE_PASSWORD" ]]; then
    echo 'A nonempty keystore password is required.' >&2
    exit 1
  fi
  read -r -s -p 'Private key password (Enter to use the same password): ' ANDROID_KEY_PASSWORD
  printf '\n'
  ANDROID_KEY_PASSWORD="${ANDROID_KEY_PASSWORD:-$ANDROID_KEYSTORE_PASSWORD}"
  export ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_PASSWORD
  (cd android && ./gradlew :app:validateSigningRelease --no-daemon --console=plain)
fi
flutter build "$artifact" --release "${options[@]}"
