#!/usr/bin/env bash
# Build a Flutter release APK and copy it to the project root for testing/sharing.
#
# Usage:
#   ./build_apk.sh              # release APK -> ./teen_aventure-<version>-release.apk
#   ./build_apk.sh --debug      # debug APK
#   ./build_apk.sh --clean      # flutter clean before build
#   ./build_apk.sh --split      # one APK per CPU architecture (smaller files)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

BUILD_MODE="release"
SPLIT_PER_ABI=false
RUN_CLEAN=false

usage() {
  cat <<'EOF'
Build APK and copy to project root.

Options:
  --debug       Build a debug APK instead of release
  --split       Build split APKs per CPU architecture (arm64-v8a, armeabi-v7a, x86_64)
  --clean       Run "flutter clean" before building
  -h, --help    Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --debug)
      BUILD_MODE="debug"
      shift
      ;;
    --split)
      SPLIT_PER_ABI=true
      shift
      ;;
    --clean)
      RUN_CLEAN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if ! command -v flutter >/dev/null 2>&1; then
  echo "Error: flutter is not on PATH. Install Flutter and add it to PATH." >&2
  exit 1
fi

VERSION="$(grep '^version:' pubspec.yaml | head -n1 | awk '{print $2}' | cut -d'+' -f1)"
APP_NAME="$(grep '^name:' pubspec.yaml | head -n1 | awk '{print $2}')"
OUTPUT_DIR="$ROOT_DIR/build/app/outputs/flutter-apk"

echo "==> Project: $APP_NAME"
echo "==> Version: $VERSION"
echo "==> Mode:    $BUILD_MODE"

if [[ "$BUILD_MODE" == "release" && ! -f "$ROOT_DIR/android/key.properties" ]]; then
  echo "Warning: android/key.properties not found. Release APK will use debug signing."
  echo "         Add a keystore before Play Store submission."
fi

echo "==> flutter pub get"
flutter pub get

if $RUN_CLEAN; then
  echo "==> flutter clean"
  flutter clean
  echo "==> flutter pub get"
  flutter pub get
fi

BUILD_ARGS=(build apk --"$BUILD_MODE")
if $SPLIT_PER_ABI; then
  BUILD_ARGS+=(--split-per-abi)
fi

echo "==> flutter ${BUILD_ARGS[*]}"
flutter "${BUILD_ARGS[@]}"

copy_apk() {
  local source="$1"
  local dest="$2"

  if [[ ! -f "$source" ]]; then
    echo "Error: expected APK not found at $source" >&2
    exit 1
  fi

  cp "$source" "$dest"
  echo "==> Copied to: $dest"
  echo "    Size: $(du -h "$dest" | awk '{print $1}')"
}

echo "==> Copying APK(s) to project root"
if $SPLIT_PER_ABI; then
  shopt -s nullglob
  copied=0
  for apk in "$OUTPUT_DIR"/app-*-"$BUILD_MODE".apk; do
    abi="${apk##*/app-}"
    abi="${abi%-$BUILD_MODE.apk}"
    dest="$ROOT_DIR/${APP_NAME}-${VERSION}-${abi}-${BUILD_MODE}.apk"
    copy_apk "$apk" "$dest"
    copied=$((copied + 1))
  done
  shopt -u nullglob

  if [[ "$copied" -eq 0 ]]; then
    echo "Error: no split APKs found in $OUTPUT_DIR" >&2
    exit 1
  fi
else
  source="$OUTPUT_DIR/app-$BUILD_MODE.apk"
  dest="$ROOT_DIR/${APP_NAME}-${VERSION}-${BUILD_MODE}.apk"
  copy_apk "$source" "$dest"
fi

echo "Done. Share the APK file(s) from:"
echo "  $ROOT_DIR"
