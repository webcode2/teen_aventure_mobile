#!/usr/bin/env bash
# Build a Flutter test APK and copy it to the project root for testing/sharing.
#
# Firebase client dart-defines are loaded from android/app/google-services.json.
# Optional overrides / API_BASE_URL may be set in .env (KEY=value lines).
#
# Usage:
#   ./build_apk.sh              # debug test APK -> ./teen_aventure-<version>-debug.apk
#   ./build_apk.sh --release    # upload-key signed release APK
#   ./build_apk.sh --clean      # flutter clean before build
#   ./build_apk.sh --split      # one APK per CPU architecture (smaller files)

set +x
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

BUILD_MODE="debug"
SPLIT_PER_ABI=false
RUN_CLEAN=false
GOOGLE_SERVICES="$ROOT_DIR/android/app/google-services.json"
ENV_FILE="$ROOT_DIR/.env"

usage() {
  cat <<'EOF'
Build APK and copy to project root.

Loads FIREBASE_* dart-defines from android/app/google-services.json.
Optional .env overrides: FIREBASE_API_KEY, FIREBASE_APP_ID,
FIREBASE_MESSAGING_SENDER_ID, FIREBASE_PROJECT_ID, API_BASE_URL, WEB_BASE_URL.

Options:
  --debug       Build a debug test APK (default; no upload password needed)
  --release     Build a release APK using saved signing settings
  --split       Build split APKs per CPU architecture (arm64-v8a, armeabi-v7a, x86_64)
  --clean       Run "flutter clean" before building
  -h, --help    Show this help message
EOF
}

# Load KEY=value from .env into the environment (no export of comments/blank lines).
load_dotenv() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  echo "==> Loading overrides from .env"
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#"${line%%[![:space:]]*}"}"
    [[ -z "$line" || "$line" == \#* ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local val="${BASH_REMATCH[2]}"
      val="${val%\"}"
      val="${val#\"}"
      val="${val%\'}"
      val="${val#\'}"
      printf -v "$key" '%s' "$val"
      export "$key"
    fi
  done <"$file"
}

# Populate FIREBASE_* from google-services.json when unset.
load_firebase_from_google_services() {
  if [[ ! -f "$GOOGLE_SERVICES" ]]; then
    echo "Error: missing $GOOGLE_SERVICES" >&2
    echo "Download it from Firebase Console into android/app/." >&2
    exit 1
  fi

  local parsed
  parsed="$(python3 - "$GOOGLE_SERVICES" <<'PY'
import json, sys
path = sys.argv[1]
with open(path, encoding="utf-8") as f:
    data = json.load(f)
info = data["project_info"]
client = data["client"][0]
api_key = client["api_key"][0]["current_key"]
app_id = client["client_info"]["mobilesdk_app_id"]
print(api_key)
print(app_id)
print(info["project_number"])
print(info["project_id"])
PY
)"

  local api_key app_id sender_id project_id
  api_key="$(sed -n '1p' <<<"$parsed")"
  app_id="$(sed -n '2p' <<<"$parsed")"
  sender_id="$(sed -n '3p' <<<"$parsed")"
  project_id="$(sed -n '4p' <<<"$parsed")"

  FIREBASE_API_KEY="${FIREBASE_API_KEY:-$api_key}"
  FIREBASE_APP_ID="${FIREBASE_APP_ID:-$app_id}"
  FIREBASE_MESSAGING_SENDER_ID="${FIREBASE_MESSAGING_SENDER_ID:-$sender_id}"
  FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-$project_id}"
  export FIREBASE_API_KEY FIREBASE_APP_ID FIREBASE_MESSAGING_SENDER_ID FIREBASE_PROJECT_ID

  if [[ -z "$FIREBASE_API_KEY" || -z "$FIREBASE_APP_ID" || -z "$FIREBASE_MESSAGING_SENDER_ID" || -z "$FIREBASE_PROJECT_ID" ]]; then
    echo "Error: could not resolve Firebase dart-defines from google-services.json / .env" >&2
    exit 1
  fi

  echo "==> Firebase dart-defines from google-services.json (project: $FIREBASE_PROJECT_ID)"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --release)
      BUILD_MODE="release"
      shift
      ;;
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

load_dotenv "$ENV_FILE"
load_firebase_from_google_services

# Gradle reads Java-properties signing values directly; never source key.properties.
# Validate before dependency resolution/compilation, using environment overrides if set.
if [[ "$BUILD_MODE" == "release" ]]; then
  trap 'unset ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_PASSWORD' EXIT
  echo "==> Validating saved release signing settings"
  if ! (cd android && ./gradlew :app:validateSigningRelease --no-daemon --console=plain); then
    if [[ ! -t 0 ]]; then
      echo "Error: correct android/key.properties or ANDROID_KEYSTORE_* signing overrides, then retry." >&2
      exit 1
    fi
    echo "Saved signing settings failed. Enter the correct passwords to retry."
    read -r -s -p 'Existing upload keystore password: ' ANDROID_KEYSTORE_PASSWORD
    printf '\n'
    if [[ -z "$ANDROID_KEYSTORE_PASSWORD" ]]; then
      echo "Error: keystore password cannot be empty." >&2
      exit 1
    fi
    read -r -s -p 'Private key password (Enter to use the same password): ' ANDROID_KEY_PASSWORD
    printf '\n'
    ANDROID_KEY_PASSWORD="${ANDROID_KEY_PASSWORD:-$ANDROID_KEYSTORE_PASSWORD}"
    export ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_PASSWORD
    (cd android && ./gradlew :app:validateSigningRelease --no-daemon --console=plain)
  fi
else
  echo "==> Test APK uses Android debug signing; upload-key passwords are not required."
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
BUILD_ARGS+=(
  --dart-define="FIREBASE_API_KEY=${FIREBASE_API_KEY}"
  --dart-define="FIREBASE_APP_ID=${FIREBASE_APP_ID}"
  --dart-define="FIREBASE_MESSAGING_SENDER_ID=${FIREBASE_MESSAGING_SENDER_ID}"
  --dart-define="FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}"
)
if [[ -n "${API_BASE_URL:-}" ]]; then
  BUILD_ARGS+=(--dart-define="API_BASE_URL=${API_BASE_URL}")
  echo "==> API_BASE_URL dart-define set"
fi

if [[ -n "${WEB_BASE_URL:-}" ]]; then
  BUILD_ARGS+=(--dart-define="WEB_BASE_URL=${WEB_BASE_URL}")
  echo "==> WEB_BASE_URL dart-define set"
fi

echo "==> flutter build apk --$BUILD_MODE (+ Firebase dart-defines)"
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
