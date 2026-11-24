"""Behavior checks for versioned bundles and narrow old-artifact retention."""
import copy
import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('delivery', Path(__file__).with_name('image-delivery.py'))
delivery = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(delivery)


class FakeOperations:
    def __init__(self, directory):
        self.directory = directory
        self.rows = [{'name': name, 'id': str(number) * 64, 'imageId': 'sha256:' + str(number) * 64,
                      'startedAt': 'original', 'running': True,
                      'health': 'healthy' if name == 'huaqing-team-gateway' else None}
                     for number, name in enumerate(['huaqing-team-edge', 'huaqing-team-gateway', 'hqzy-' + 'a' * 36], 1)]
        self.valid = True
        self.exports = 0

    def perform(self, request):
        if request['operation'] == 'status':
            return {'containers': copy.deepcopy(self.rows), 'missingBindSources': []}
        self.exports += 1
        data = b'complete image bundle fixture'
        digest = hashlib.sha256(data).hexdigest()
        path = self.directory / ('huaqing-harness-linux-x86-' + digest + '-20261103180000.tar.gz')
        path.write_bytes(data)
        Path(str(path) + '.sha256').write_text(digest + '  ' + path.name + '\n')
        Path(str(path).removesuffix('.tar.gz') + '.manifest.json').write_text('{}\n')
        return {'containers': copy.deepcopy(self.rows), 'archive': str(path), 'bytes': len(data),
                'sha256': digest, 'checks': {key: self.valid for key in delivery.CHECKS}}


class ImageDeliveryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.images, self.ops = self.root / 'images', self.root / '.ansible-ops'
        self.images.mkdir()
        self.ops.mkdir()
        self.fake = FakeOperations(self.images)
        for key, value in [('ROOT', self.root), ('IMAGES', self.images), ('OPS', self.ops)]:
            replacement = patch.object(delivery, key, value)
            replacement.start()
            self.addCleanup(replacement.stop)
        replacement = patch.object(delivery, 'operations', return_value=self.fake)
        replacement.start()
        self.addCleanup(replacement.stop)
        replacement = patch.object(delivery, 'filename', return_value='huaqing-harness-0.1.0-linux-x86-' + 'b' * 32 + '-20261103181000.tar.gz')
        replacement.start()
        self.addCleanup(replacement.stop)
        self.request = {'service': {'directory': str(self.root / 'huaqing-harness'), 'docker_socket': delivery.SOCKET,
            'project': 'huaqing-team', 'port': 28003, 'url': 'http://192.168.2.11:28003',
            'archive_prefix': 'huaqing-harness', 'additional_images': [],
            'containers': [row['name'] for row in self.fake.rows]}, 'action': 'plan'}
        self.old = self.images / ('huaqing-harness-linux-x86-' + 'c' * 64 + '-20261103173729.tar.gz')
        self.old.write_bytes(b'old complete bundle')
        Path(str(self.old) + '.sha256').write_text('old  ' + self.old.name + '\n')
        Path(str(self.old).removesuffix('.tar.gz') + '.manifest.json').write_text('{}\n')

    def prepared(self):
        result = delivery.run(self.request)
        request = {**self.request, 'action': 'apply', 'confirm': True, 'receiptId': result['receiptId']}
        return result, request

    def test_moves_only_old_image_files_and_keeps_source_other_apps_and_del(self):
        source = self.images / 'huaqing-harness-source-20261103.tar.gz'
        source.write_bytes(b'source')
        other = self.images / 'huaqing-switch-linux-x86-other.tar.gz'
        other.write_bytes(b'other service')
        existing = self.images / 'del' / 'prior'
        existing.mkdir(parents=True)
        (existing / self.old.name).write_bytes(b'prior retained artifact')
        alias = self.root / 'huaqing-harness-images-linux-amd64-branding-20261103.tar.gz'
        os.link(self.old, alias)
        before, request = self.prepared()
        result = delivery.run(request)
        self.assertEqual(result['phase'], 'complete')
        self.assertEqual(self.fake.exports, 1)
        self.assertFalse(self.old.exists())
        self.assertFalse(alias.exists())
        self.assertEqual(source.read_bytes(), b'source')
        self.assertEqual(other.read_bytes(), b'other service')
        self.assertEqual((existing / self.old.name).read_bytes(), b'prior retained artifact')
        self.assertTrue(all(Path(row['destination']).is_file() for row in result['oldFileMoves']))
        new = Path(result['archive'])
        self.assertTrue(delivery.NEW_NAME.fullmatch(new.name))
        self.assertEqual(Path(str(new) + '.sha256').read_text(), result['sha256'] + '  ' + new.name + '\n')
        self.assertEqual(json.loads(Path(str(new) + '.manifest.json').read_text())['archive'], str(new))
        self.assertEqual(len(result['oldFileMoves']), len(before['oldFiles']))

    def test_export_verification_failure_moves_no_old_files(self):
        before, request = self.prepared()
        self.fake.valid = False
        with self.assertRaisesRegex(delivery.DeliveryError, 'fresh-export-verification-failed'):
            delivery.run(request)
        self.assertTrue(all(Path(row['path']).is_file() for row in before['oldFiles']))
        self.assertFalse(Path(before['archive']).exists())

    def test_runtime_drift_rejects_before_export(self):
        before, request = self.prepared()
        self.fake.rows[0]['startedAt'] = 'restarted elsewhere'
        with self.assertRaisesRegex(delivery.DeliveryError, 'runtime-drift'):
            delivery.run(request)
        self.assertEqual(self.fake.exports, 0)
        self.assertTrue(self.old.is_file())

    def test_existing_delivery_or_retention_targets_are_not_overwritten(self):
        before, request = self.prepared()
        Path(before['archive']).write_bytes(b'existing delivery')
        with self.assertRaises(delivery.DeliveryError):
            delivery.run(request)
        self.assertEqual(Path(before['archive']).read_bytes(), b'existing delivery')
        self.assertEqual(self.fake.exports, 0)
        Path(before['archive']).unlink()
        Path(before['retentionDirectory']).mkdir(parents=True)
        with self.assertRaisesRegex(delivery.DeliveryError, 'retention-destination-exists'):
            delivery.run(request)
        self.assertTrue(self.old.is_file())

    def test_unknown_archive_symlink_is_refused(self):
        linked = self.images / ('huaqing-harness-linux-x86-' + 'd' * 64 + '-20261103173729.tar.gz')
        linked.symlink_to(self.old)
        with self.assertRaisesRegex(delivery.DeliveryError, 'regular-archive-file-required'):
            delivery.run(self.request)


class FilenameTests(unittest.TestCase):
    def test_filename_uses_openssl_32_hex_and_beijing_timestamp(self):
        original = datetime.datetime
        class FixedClock(original):
            @classmethod
            def now(cls, zone):
                return cls(2026, 1, 1, 0, 0, 1, tzinfo=datetime.timezone.utc).astimezone(zone)
        result = subprocess.CompletedProcess([], 0, 'a' * 32 + '\n', '')
        with patch.object(delivery.subprocess, 'run', return_value=result) as run:
            with patch.object(delivery.datetime, 'datetime', FixedClock):
                name = delivery.filename()
        self.assertEqual(name, 'huaqing-harness-0.1.0-linux-x86-' + 'a' * 32 + '-20260101080001.tar.gz')
        self.assertEqual(run.call_args.args[0], ['openssl', 'rand', '-hex', '16'])


if __name__ == '__main__':
    unittest.main()
