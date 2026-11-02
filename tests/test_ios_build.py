"""Exercise packaging and failure boundaries with fake Xcode, not native builds."""

import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import tempfile
import unittest
import zipfile


class IOSBuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'scripts').mkdir()
        shutil.copy(Path(__file__).resolve().parents[1] / 'scripts/build-ios.sh',
                    self.root / 'scripts/build-ios.sh')
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        self.env = {key: value for key, value in os.environ.items()
                    if not key.startswith('IOS_')}
        self.env['PATH'] = str(self.bin) + os.pathsep + self.env['PATH']
        self.command('uname', '#!/bin/sh\necho Darwin\n')
        self.command('xcodebuild', '''#!/usr/bin/env python3
import json, os, pathlib, sys, zipfile
args = sys.argv[1:]
with open('calls.jsonl', 'a') as file:
    file.write(json.dumps(args) + '\\n')
if os.environ.get('FAIL_XCODE'):
    sys.exit(65)
if '-exportArchive' in args:
    if os.environ.get('FAIL_EXPORT'):
        sys.exit(70)
    output = pathlib.Path(args[args.index('-exportPath') + 1])
    output.mkdir(parents=True)
    with zipfile.ZipFile(output / 'App.ipa', 'w') as file:
        file.writestr('Payload/App.app/App', 'simulated signed executable')
else:
    archive = pathlib.Path(args[args.index('-archivePath') + 1])
    app = archive / 'Products/Applications/App.app'
    app.mkdir(parents=True)
    (app / 'App').write_text('simulated device executable')
''')
        self.command('ditto', '''#!/usr/bin/env python3
import pathlib, shutil, sys, zipfile
source, destination = map(pathlib.Path, sys.argv[-2:])
if '-c' in sys.argv:
    with zipfile.ZipFile(destination, 'w') as file:
        for path in source.rglob('*'):
            if path.is_file():
                file.write(path, path.relative_to(source.parent))
else:
    shutil.copytree(source, destination)
''')

    def command(self, name, contents):
        path = self.bin / name
        path.write_text(contents)
        path.chmod(0o755)

    def build(self, mode='unsigned'):
        return subprocess.run(['bash', 'scripts/build-ios.sh', mode], cwd=self.root,
                              env=self.env, capture_output=True, text=True)

    def test_unsigned_device_payload(self):
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        ipa = self.root / 'ios/App/output/unsigned/hush-unsigned.ipa'
        with zipfile.ZipFile(ipa) as file:
            self.assertEqual(file.namelist(), ['Payload/App.app/App'])
        self.assertEqual(list(self.root.rglob('*.sha256')), [])
        calls = (self.root / 'calls.jsonl').read_text()
        self.assertIn('iphoneos', calls)
        self.assertIn('CODE_SIGNING_ALLOWED=NO', calls)
        self.assertNotIn('-exportArchive', calls)

    def test_signed_export_uses_selected_team_profile_and_method(self):
        self.env.update(IOS_TEAM_ID='TEAM123', IOS_PROFILE_UUID='profile-uuid',
                        IOS_EXPORT_METHOD='release-testing', IOS_BUILD_NUMBER='42')
        result = self.build('signed')
        self.assertEqual(result.returncode, 0, result.stderr)
        output = self.root / 'ios/App/output/signed'
        self.assertTrue((output / 'hush-signed.ipa').is_file())
        with open(output / 'ExportOptions.plist', 'rb') as file:
            options = plistlib.load(file)
        self.assertEqual(options['teamID'], 'TEAM123')
        self.assertEqual(options['method'], 'release-testing')
        self.assertEqual(options['provisioningProfiles'], {'site.hushpaid.app': 'profile-uuid'})
        calls = (self.root / 'calls.jsonl').read_text()
        self.assertIn('CURRENT_PROJECT_VERSION=42', calls)
        self.assertIn('-exportArchive', calls)
        self.assertNotIn('CODE_SIGNING_ALLOWED=NO', calls)

    def test_missing_signing_credentials_fail_without_unsigned_fallback(self):
        result = self.build('signed')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('IOS_TEAM_ID', result.stderr)
        self.assertFalse((self.root / 'calls.jsonl').exists())
        self.assertEqual(list(self.root.rglob('*.ipa')), [])

    def test_failed_archive_removes_previous_ipa_and_propagates_failure(self):
        self.assertEqual(self.build().returncode, 0)
        self.env['FAIL_XCODE'] = '1'
        self.assertEqual(self.build().returncode, 65)
        self.assertEqual(list(self.root.rglob('*.ipa')), [])
        self.assertEqual(list(self.root.rglob('*.sha256')), [])

    def test_export_failure_never_publishes_a_signed_ipa(self):
        self.env.update(IOS_TEAM_ID='TEAM123', IOS_PROFILE_UUID='profile-uuid',
                        IOS_EXPORT_METHOD='app-store-connect', FAIL_EXPORT='1')
        self.assertEqual(self.build('signed').returncode, 70)
        self.assertEqual(list(self.root.rglob('*.ipa')), [])
        self.assertEqual(list(self.root.rglob('*.sha256')), [])

    def test_rejects_unknown_mode_and_non_macos_host(self):
        self.assertNotEqual(self.build('typo').returncode, 0)
        self.command('uname', '#!/bin/sh\necho Linux\n')
        result = self.build()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('require macOS', result.stderr)
        self.assertFalse((self.root / 'calls.jsonl').exists())


if __name__ == '__main__':
    unittest.main()
