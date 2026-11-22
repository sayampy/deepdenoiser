#!/usr/bin/env bash
set -euo pipefail

profile="${1:?Usage: build-android-local.sh <development|production|playstore>}"
shift
ndk_version="28.1.13356709"
build_tmp="${EAS_LOCAL_BUILD_TMPDIR:-${XDG_CACHE_HOME:-$HOME/.cache}/deepdenoiser/eas-build-local}"

sdk=""
for candidate in "${ANDROID_HOME:-}" "${ANDROID_SDK_ROOT:-}" "$HOME/Android/Sdk"; do
  if [[ -n "$candidate" && -d "$candidate/platforms" && -d "$candidate/licenses" ]]; then
    sdk="$(realpath "$candidate")"
    break
  fi
done

if [[ -z "$sdk" ]]; then
  echo "Android SDK not found. Set ANDROID_HOME or ANDROID_SDK_ROOT to an installed SDK." >&2
  exit 1
fi

ndk="$sdk/ndk/$ndk_version"
if [[ ! -d "$ndk" ]]; then
  echo "Android NDK $ndk_version not found at $ndk." >&2
  exit 1
fi

export ANDROID_HOME="$sdk"
export ANDROID_SDK_ROOT="$sdk"
export ANDROID_NDK="$ndk"
export ANDROID_NDK_HOME="$ndk"
export ANDROID_NDK_ROOT="$ndk"
mkdir -p "$build_tmp"
export TMPDIR="$(realpath "$build_tmp")"
export TMP="$TMPDIR"
export TEMP="$TMPDIR"
if ! command -v eas >/dev/null 2>&1; then
  echo "EAS CLI not found. Install eas-cli and retry." >&2
  exit 1
fi

exec eas build \
  --platform android \
  --profile "$profile" \
  --local \
  "$@"
