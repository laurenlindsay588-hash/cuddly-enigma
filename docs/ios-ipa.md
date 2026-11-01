# iOS IPA artifacts

The existing Capacitor app packages the React website at
https://hushpaid.netlify.app using bundled web assets. `npm run ios:ipa` builds
those assets, syncs the iOS project, archives a **Release device build** with
Xcode, and packages an IPA. It does not deploy or add an API.

## Version 5.1.13 and ESign

The package version is 5.1.13 and both iOS build configurations use marketing
version **5.1.13**. This release adds a Chrome-style settings page, backup and
restore, a local focus timer, and a local scratchpad. It adds no backend.

To get this version, open the **Build iOS IPA** run for the exact 5.1.13 commit.
A successful run exposes a **Download hush 5.1.13 IPA and checksum** link in its
summary and the `hush-ios-5.1.13-unsigned-<run number>` artifact. GitHub sign-in and
repository access may be required; artifacts expire after 14 days. Extract the
ZIP, check `hush-unsigned.ipa.sha256`, and import `hush-unsigned.ipa` from Files
into ESign for signing with your own certificate and matching profile. No signing
credentials are needed by the unsigned build workflow.

The older verified artifact documented below is **version 1.0, not 5.1.13**.
A new 5.1.13 IPA is available only after its macOS device build succeeds. The local
Linux environment can build and sync the web assets but cannot run Xcode or the
iOS SDK; `npm run ios:ipa` reports that requirement. Never rename an older IPA or
package web assets alone as a new device build. ESign installation and native
iPhone behavior still require a physical-device check.

## GitHub Actions

The **Build iOS IPA** workflow (`.github/workflows/ios-ipa.yml`) runs on pull
requests and can be started manually from Actions. It uses macOS 15, Xcode 26.0,
Node 22, and the lockfile. The shared `App` scheme supports headless archives.

By default, it creates `hush-unsigned.ipa` and a SHA-256 checksum in the run's
`hush-ios-5.1.13-unsigned-<run number>` artifact. Download and unzip that artifact from
the Actions run page; artifacts expire after 14 days. The IPA contains a device
`Payload/App.app`, **not a simulator app**. It is unsigned and cannot be installed
on an iPhone or submitted to App Store Connect until correctly signed and
provisioned. A successful simulator check alone does not produce an IPA.

For a signed IPA, configure these repository secrets, then manually run the
workflow with **signed** enabled and the matching **export_method**:

| Secret | Required value |
| --- | --- |
| `IOS_CERTIFICATE_BASE64` | Base64-encoded `.p12` containing an Apple Distribution certificate **and its private key** |
| `IOS_CERTIFICATE_PASSWORD` | Nonempty password used to export that `.p12` |
| `IOS_PROVISION_PROFILE_BASE64` | Base64-encoded, unexpired distribution `.mobileprovision` for the bundle ID and certificate |
| `IOS_TEAM_ID` | Apple Developer team ID that owns the profile and certificate |

An active Apple Developer Program membership and registered bundle ID are
required. The current bundle ID is `site.hushpaid.app`; confirm ownership before
release. If changing it, update the Capacitor config, both Xcode target build
configurations, the build script's export mapping, and the workflow's profile
validation together.

- **release-testing** exports an Ad Hoc IPA. Its provisioning profile must include
  each test device's UDID. Install only on those registered devices.
- **app-store-connect** exports an App Store/TestFlight IPA using an App Store
  distribution profile. It requires a subsequent App Store Connect upload and
  processing; it cannot be directly installed like an Ad Hoc build.

The workflow imports credentials into a temporary keychain, checks the profile's
team, bundle ID, and expiry, and removes signing files and the keychain even if
building fails. Pull requests never import signing credentials. A signed run
fails if required secrets are missing; it does not substitute an unsigned IPA.
Only IPA files and checksums are uploaded. The workflow uses its run number as
the app build number; use a number greater than any previously uploaded version
when uploading to App Store Connect.

No App Store Connect API key is needed to create the IPA. This workflow performs
no upload, publication, or submission. Those steps require separate App Store
Connect access and the publisher's metadata, privacy disclosures, and review.

## Local builds

Use macOS, Xcode 26+ with the iOS SDK installed and its license accepted, and
Node 22.18+. The existing Swift Package Manager setup requires no CocoaPods.

```sh
npm ci
npm run ios:ipa
# Output: ios/App/output/unsigned/hush-unsigned.ipa and .ipa.sha256
```

For a signed local build, first import the distribution certificate/private key
into your keychain and install the matching provisioning profile. Then:

```sh
export IOS_TEAM_ID=YOUR_TEAM_ID
export IOS_PROFILE_UUID=YOUR_INSTALLED_PROFILE_UUID
export IOS_EXPORT_METHOD=release-testing # or app-store-connect
export IOS_BUILD_NUMBER=1 # choose an unused number for App Store Connect
npm run ios:ipa -- signed
# Output: ios/App/output/signed/hush-signed.ipa and .ipa.sha256
```

Archives and export metadata stay under the ignored `ios/App/output/` directory.
Each build clears its mode's output first so a failed build cannot upload an old
IPA. Never commit certificates, private keys, provisioning profiles, or IPAs.

## Verified unsigned build for ESign

On 2026-10-29, the macOS build from PR #9 was downloaded and verified. That
workflow finished after the original development session; a new build was not
needed for the app source at that point. This artifact predates the subsequent
browser interface refresh; it does not include that refresh. Download a new
artifact from a successful **Build iOS IPA** run for the updated commit to install
the new interface.

- [Download `hush-ios-unsigned-1`](https://github.com/hush-paid01-hash/cuddly-enigma/actions/runs/40932899783/artifacts/12923586720)
  from the [successful device build](https://github.com/hush-paid01-hash/cuddly-enigma/actions/runs/40932899783).
  The GitHub artifact expires on 2026-11-12 and may require GitHub sign-in.
- Source commit: `d374a1b68f9379939fb1b41aea1d827c72b10418` (merged by PR #9).
  Xcode 26.0.1 built version 1.0 (build 1), bundle ID `site.hushpaid.app`,
  minimum iOS 15.0.
- Extract the downloaded ZIP to obtain `hush-unsigned.ipa` (1,597,535 bytes)
  and `hush-unsigned.ipa.sha256`. The IPA is also attached to issue HUS-8.

The verified IPA SHA-256 is:

```text
b36b893adbb428ef11852251aa1f16b032172ea2bf281808107501c32be6167f
```

Verification checked both ZIP archives for corruption, matched the artifact ZIP
against GitHub's digest and the IPA against its supplied checksum, and inspected
the bundled `Info.plist` and Mach-O load commands. `Payload/App.app/App` and the
embedded Capacitor and Cordova frameworks are ARM64 binaries with the **iOS
device** platform (`LC_BUILD_VERSION` platform 2). All three lack code signature
commands and encryption; no provisioning profile or signature directory is
present. The app includes its bundled website HTML and JavaScript. This is an
actual compiled device IPA, not a simulator app or a packaging test fixture.

To use it with ESign, save the extracted `.ipa` to Files, import it into ESign,
then sign it using your own certificate and matching provisioning profile before
installation. No Apple credentials were used or requested to create this
unsigned artifact. ESign signing and installation on a physical device have not
been tested in this session.

## Packaging tests

Web build and Capacitor synchronization can run without Xcode. The packaging
script tests use simulated Xcode command results to check unsigned IPA layout,
checksums, signed export options, and failure handling:

```sh
python3 -m unittest discover -s tests -p 'test_ios_build.py'
npm run ios:sync
```

These checks do not compile Swift or validate Apple signatures. Future IPA
creation requires a successful macOS workflow or local Xcode build; signed IPA
creation additionally requires the credentials above. Device installation and
the native review checklist in [iOS setup](ios-and-api.md) remain release checks.
