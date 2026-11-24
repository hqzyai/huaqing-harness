#!/usr/bin/env python3
"""Read back the completed Harness bundle, sidecars, retention and service health."""
import fcntl
import http.client
import importlib.util
import json
from pathlib import Path
import re
import sys


def verify(request):
    spec = importlib.util.spec_from_file_location('harness_delivery', Path(__file__).with_name('harness_image_delivery.py'))
    delivery = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(delivery)
    delivery.check_scope(request)
    identity = request['receiptId']
    delivery.require(re.fullmatch(r'[0-9a-f]{32}', identity), 'delivery-receipt-required')
    with (delivery.OPS / 'harness.lock').open('r+') as lock:
        fcntl.flock(lock, fcntl.LOCK_SH | fcntl.LOCK_NB)
        folder = delivery.OPS / 'harness-image-deliveries' / identity
        delivery.require(folder.is_dir() and not folder.is_symlink(), 'delivery-receipt-invalid')
        receipt = json.loads((folder / 'receipt.json').read_bytes())
        delivery.require(receipt['id'] == identity and receipt['phase'] == 'complete', 'completed-delivery-required')
        delivery.require(receipt['service'] == request['service'], 'inventory-drift')
        archive = Path(receipt['archive'])
        delivery.require(archive.parent == delivery.IMAGES and delivery.NEW_NAME.fullmatch(archive.name), 'delivery-filename-invalid')
        actual = {row['path']: row for row in delivery.current_files()}
        expected = {str(archive), str(archive) + '.sha256', str(archive) + '.manifest.json'}
        delivery.require(set(actual) == expected, 'unexpected-current-image-files')
        exported = receipt['export']
        delivery.require(actual[str(archive)]['sha256'] == exported['sha256'], 'delivery-sha-mismatch')
        delivery.require(Path(str(archive) + '.sha256').read_text().split() == [exported['sha256'], archive.name], 'checksum-sidecar-mismatch')
        manifest = json.loads(Path(str(archive) + '.manifest.json').read_bytes())
        delivery.require(manifest['archive'] == str(archive) and manifest['sha256'] == exported['sha256']
                         and manifest['deliveryVersion'] == '0.1.0', 'delivery-manifest-mismatch')
        delivery.require(all(manifest['checks'].get(key) is True for key in delivery.CHECKS), 'export-checks-missing')
        delivery.require(len(receipt['moves']) == len(receipt['files']), 'retention-plan-invalid')
        for previous, move in zip(receipt['files'], receipt['moves']):
            source, destination = Path(move['source']), Path(move['destination'])
            expected_destination = delivery.IMAGES / 'del' / identity / ('images' if source.parent == delivery.IMAGES else 'workspace-root') / source.name
            delivery.require(move['state'] == 'moved' and source == Path(previous['path'])
                             and destination == expected_destination, 'retention-journal-invalid')
            delivery.require(not source.exists() and not source.is_symlink(), 'old-source-still-present')
            delivery.require(delivery.same_file(previous, delivery.record(destination)), 'retained-file-mismatch')
        current = delivery.summary(request)
        delivery.require(current == receipt['containers'] == manifest['containers'], 'runtime-drift')
        connection = http.client.HTTPConnection('192.168.2.11', 28003, timeout=15)
        try:
            connection.request('GET', '/team/health')
            response = connection.getresponse()
            delivery.require(response.status == 200 and json.loads(response.read(2048)).get('ok') is True, 'public-health-failed')
        finally:
            connection.close()
        return {'verified': True, 'readOnly': True, 'receiptId': identity, 'archive': str(archive),
                'sha256': exported['sha256'], 'bytes': actual[str(archive)]['bytes'],
                'filenameVerified': True, 'sidecarsMatch': True, 'onlyNewImageFilesRemain': True,
                'retainedOldFiles': len(receipt['moves']), 'oldSourcesAbsent': True,
                'retainedFilesMatch': True, 'servicesUnchanged': True, 'publicHealth': 200,
                'currentImageFiles': sorted(actual)}


if __name__ == '__main__':
    try:
        print(json.dumps(verify(json.load(sys.stdin))))
    except BaseException as error:
        print(json.dumps({'verified': False, 'errorType': type(error).__name__, 'errorCode': 'delivery-readback-failed'}))
        sys.exit(1)
