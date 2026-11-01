#!/usr/bin/env bash
set -euo pipefail

mode="${1:-unsigned}"
case "$mode" in
  unsigned|signed) ;;
  *) echo 'Usage: npm run ios:ipa -- [unsigned|signed]' >&2; exit 1 ;;
esac

if [[ "$(uname -s)" != Darwin ]] || ! command -v xcodebuild >/dev/null; then
  echo 'IPA builds require macOS with Xcode 26+ and the iOS SDK.' >&2
  exit 1
fi

cd "$(dirname "$0")/.."
output="$PWD/ios/App/output/$mode"
# Prevent an old IPA from being mistaken for the result of a failed build.
rm -rf "$output"
mkdir -p "$output"
archive="$output/hush.xcarchive"
signing=(CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO)

if [[ "$mode" == signed ]]; then
  : "${IOS_TEAM_ID:?Set IOS_TEAM_ID to your Apple Developer team ID}"
  : "${IOS_PROFILE_UUID:?Set IOS_PROFILE_UUID to the installed provisioning profile UUID}"
  : "${IOS_EXPORT_METHOD:?Set IOS_EXPORT_METHOD to app-store-connect or release-testing}"
  case "$IOS_EXPORT_METHOD" in
    app-store-connect|release-testing) ;;
    *) echo 'Unsupported IOS_EXPORT_METHOD' >&2; exit 1 ;;
  esac
  signing=(CODE_SIGN_STYLE=Manual "DEVELOPMENT_TEAM=$IOS_TEAM_ID"
    'CODE_SIGN_IDENTITY=Apple Distribution' "PROVISIONING_PROFILE_SPECIFIER=$IOS_PROFILE_UUID")
  # plistlib escapes values safely and produces a real Xcode export options file.
  python3 - "$output/ExportOptions.plist" <<'PY'
import os, plistlib, sys
with open(sys.argv[1], 'wb') as file:
    plistlib.dump({
        'method': os.environ['IOS_EXPORT_METHOD'],
        'teamID': os.environ['IOS_TEAM_ID'],
        'signingStyle': 'manual',
        'signingCertificate': 'Apple Distribution',
        'provisioningProfiles': {'site.hushpaid.app': os.environ['IOS_PROFILE_UUID']},
        'manageAppVersionAndBuildNumber': False,
    }, file)
PY
fi

xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' \
  -archivePath "$archive" \
  "CURRENT_PROJECT_VERSION=${IOS_BUILD_NUMBER:-1}" \
  "${signing[@]}" archive

if [[ "$mode" == signed ]]; then
  xcodebuild -exportArchive -archivePath "$archive" \
    -exportOptionsPlist "$output/ExportOptions.plist" -exportPath "$output/export"
  test -s "$output/export/App.ipa"
  mv "$output/export/App.ipa" "$output/hush-signed.ipa"
else
  # A device build packaged as Payload/App.app, deliberately without a signature.
  # It cannot be installed on an iPhone or uploaded to App Store Connect as-is.
  test -d "$archive/Products/Applications/App.app"
  staging="$(mktemp -d)"
  trap 'rm -rf "$staging"' EXIT
  mkdir "$staging/Payload"
  ditto "$archive/Products/Applications/App.app" "$staging/Payload/App.app"
  ditto -c -k --keepParent "$staging/Payload" "$output/hush-unsigned.ipa"
fi

test -s "$output/hush-$mode.ipa"
unzip -t "$output/hush-$mode.ipa"
echo "Created $output/hush-$mode.ipa ($mode)"
