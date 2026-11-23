#!/usr/bin/env python3
"""Deliver the current Harness image bundle and retain old bundles under del/."""
import datetime
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import uuid
from zoneinfo import ZoneInfo

ROOT = Path('/home/ubuntu/Workspace')
IMAGES = ROOT / 'images'
OPS = ROOT / '.ansible-ops'
SOCKET = 'unix:///run/user/1001/huaqing-docker/docker.sock'
OLD_NAME = re.compile(r'huaqing-harness-(?:linux-x86-[0-9a-f]{64}-[0-9]{14}|[0-9]+\.[0-9]+\.[0-9]+-linux-x86-[0-9a-f]{32}-[0-9]{14}|images-linux-amd64-(?:branding-)?[0-9]{8})\.tar\.gz')
NEW_NAME = re.compile(r'huaqing-harness-0\.1\.0-linux-x86-[0-9a-f]{32}-[0-9]{14}\.tar\.gz')
CHECKS = ('gzip', 'blobHashes', 'imageIdentity', 'actualDockerLoad', 'servicesUnchanged')


class DeliveryError(RuntimeError):
    """A credential-free failure code for a bounded delivery stage."""


def require(value, code):
    if not value:
        raise DeliveryError(code)


def operations():
    spec = importlib.util.spec_from_file_location('harness_image_service_ops', Path(__file__).with_name('service_ops.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def record(path):
    before = path.lstat()
    require(stat.S_ISREG(before.st_mode), 'regular-archive-file-required')
    with path.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    after = path.lstat()
    require((before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_mode)
            == (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_mode), 'file-changed-during-hash')
    return {'path': str(path), 'dev': after.st_dev, 'inode': after.st_ino, 'bytes': after.st_size,
            'mtimeNs': after.st_mtime_ns, 'mode': stat.S_IMODE(after.st_mode), 'links': after.st_nlink, 'sha256': digest}


def same_file(expected, actual):
    return all(expected[key] == actual[key] for key in ('dev', 'inode', 'bytes', 'mtimeNs', 'mode', 'sha256'))


def sidecars(archive):
    return [Path(str(archive) + '.sha256'), Path(str(archive).removesuffix('.tar.gz') + '.manifest.json'),
            Path(str(archive) + '.manifest.json')]


def current_files():
    files = []
    for directory in (IMAGES, ROOT):
        require(directory.is_dir() and not directory.is_symlink(), 'archive-directory-invalid')
        for archive in sorted(directory.iterdir()):
            if not OLD_NAME.fullmatch(archive.name):
                continue
            files.append(record(archive))
            for path in sidecars(archive):
                if path.exists() or path.is_symlink():
                    files.append(record(path))
    require(len({row['path'] for row in files}) == len(files), 'duplicate-archive-path')
    return files


def save(folder, receipt):
    path = folder / 'receipt.json'
    temporary = folder / (uuid.uuid4().hex + '.partial')
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, 'w') as output:
        json.dump(receipt, output, indent=2)
        output.write('\n')
        output.flush()
        os.fsync(output.fileno())
    os.replace(temporary, path)


def exclusive_file(path, content):
    temporary = path.with_name('.' + path.name + '.' + uuid.uuid4().hex + '.partial')
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, 'w') as output:
        output.write(content)
        output.flush()
        os.fsync(output.fileno())
    os.link(temporary, path, follow_symlinks=False)
    temporary.unlink()


def move_without_replace(source, destination):
    require(not destination.exists() and not destination.is_symlink(), 'archive-destination-exists')
    os.link(source, destination, follow_symlinks=False)
    source.unlink()


def summary(request):
    result = operations().perform({'service': request['service'], 'key': 'harness', 'operation': 'status'})
    require(not result['missingBindSources'], 'missing-bind-source')
    rows = result['containers']
    require(len(rows) == 3 and len({row['imageId'] for row in rows}) == 3, 'three-service-images-required')
    require(all(row['running'] for row in rows), 'running-service-required')
    require(next(row for row in rows if row['name'] == 'huaqing-team-gateway')['health'] == 'healthy', 'healthy-gateway-required')
    return rows


def filename():
    result = subprocess.run(['openssl', 'rand', '-hex', '16'], capture_output=True, text=True, timeout=10)
    require(result.returncode == 0 and re.fullmatch(r'[0-9a-f]{32}\n?', result.stdout), 'openssl-random-failed')
    stamp = datetime.datetime.now(ZoneInfo('Asia/Shanghai')).strftime('%Y%m%d%H%M%S')
    name = 'huaqing-harness-0.1.0-linux-x86-' + result.stdout.strip() + '-' + stamp + '.tar.gz'
    require(NEW_NAME.fullmatch(name), 'delivery-filename-invalid')
    return name


def delivery_summary(receipt):
    return {'verified': receipt['phase'] in ('planned', 'complete'), 'phase': receipt['phase'],
            'receiptId': receipt['id'], 'archive': receipt['archive'], 'version': '0.1.0',
            'containers': receipt['containers'], 'oldFileMoves': receipt['moves'],
            'oldFiles': receipt['files'], 'diskFreeBytes': receipt['diskFreeBytes'],
            'retentionDirectory': receipt['retention'],
            **({'sha256': receipt['export']['sha256'], 'bytes': receipt['export']['bytes'],
                'checks': receipt['export']['checks']} if 'export' in receipt else {})}


def check_scope(request):
    service = request['service']
    require(service['directory'] == str(ROOT / 'huaqing-harness') and service['docker_socket'] == SOCKET
            and service['project'] == 'huaqing-team' and service['port'] == 28003
            and service['url'] == 'http://192.168.2.11:28003'
            and service['archive_prefix'] == 'huaqing-harness'
            and not service['additional_images'], 'harness-delivery-scope-refused')
    names = service['containers']
    require(len(names) == 3 and 'huaqing-team-edge' in names and 'huaqing-team-gateway' in names
            and sum(bool(re.fullmatch(r'hqzy-[0-9a-f-]{36}', name)) for name in names) == 1,
            'harness-container-scope-refused')


def plan(request, parent):
    containers = summary(request)
    files = current_files()
    usage = shutil.disk_usage(IMAGES)
    require(usage.free > 50 * 1024**3, 'insufficient-export-space')
    identity = uuid.uuid4().hex
    batch = IMAGES / 'del' / identity
    require(not (IMAGES / 'del').is_symlink() and not batch.exists(), 'retention-directory-invalid')
    archive = IMAGES / filename()
    require(not archive.exists() and not any(path.exists() for path in sidecars(archive)), 'new-delivery-already-exists')
    moves = []
    for row in files:
        path = Path(row['path'])
        destination = batch / ('images' if path.parent == IMAGES else 'workspace-root') / path.name
        require(row['dev'] == IMAGES.stat().st_dev, 'cross-filesystem-retention-refused')
        moves.append({'source': row['path'], 'destination': str(destination), 'state': 'pending'})
    folder = parent / identity
    folder.mkdir(mode=0o700)
    receipt = {'schema': 1, 'id': identity, 'phase': 'planned', 'service': request['service'],
               'containers': containers, 'files': files, 'moves': moves, 'archive': str(archive),
               'diskFreeBytes': usage.free, 'retention': str(batch)}
    save(folder, receipt)
    return delivery_summary(receipt)


def frozen(request, receipt, allowed=()):
    require(request['service'] == receipt['service'], 'inventory-drift')
    require(summary(request) == receipt['containers'], 'runtime-drift')
    require(not (IMAGES / 'del').is_symlink()
            and not Path(receipt['retention']).exists(), 'retention-destination-exists')
    actual = {row['path']: row for row in current_files() if row['path'] not in allowed}
    require(set(actual) == {row['path'] for row in receipt['files']}, 'archive-file-set-drift')
    for row in receipt['files']:
        require(same_file(row, actual[row['path']]), 'archive-file-drift')


def publish(request, folder, receipt, exported):
    require(all(exported.get('checks', {}).get(key) is True for key in CHECKS), 'fresh-export-verification-failed')
    require(exported['containers'] == receipt['containers'], 'export-runtime-drift')
    source = Path(exported['archive'])
    require(source.parent == IMAGES and OLD_NAME.fullmatch(source.name)
            and str(source) not in {row['path'] for row in receipt['files']}, 'fresh-export-path-invalid')
    generated = [source, *[path for path in sidecars(source) if path.exists() or path.is_symlink()]]
    frozen(request, receipt, {str(path) for path in generated})
    require(record(source)['sha256'] == exported['sha256'], 'fresh-export-sha-mismatch')
    destination = Path(receipt['archive'])
    require(destination.parent == IMAGES and NEW_NAME.fullmatch(destination.name), 'delivery-filename-invalid')
    require(not destination.exists() and not any(path.exists() or path.is_symlink() for path in sidecars(destination)),
            'new-delivery-already-exists')
    receipt.update(phase='publishing', export=exported)
    save(folder, receipt)
    move_without_replace(source, destination)
    exclusive_file(Path(str(destination) + '.sha256'), exported['sha256'] + '  ' + destination.name + '\n')
    manifest = {**exported, 'archive': str(destination), 'deliveryVersion': '0.1.0',
                'filenameRandomSource': 'openssl rand -hex 16', 'timestampTimezone': 'Asia/Shanghai',
                'deliveryReceipt': str(folder / 'receipt.json')}
    exclusive_file(Path(str(destination) + '.manifest.json'), json.dumps(manifest, indent=2) + '\n')
    evidence = folder / 'export-evidence'
    evidence.mkdir(mode=0o700)
    for path in generated[1:]:
        record(path)
        move_without_replace(path, evidence / path.name)
    receipt['phase'] = 'archiving'
    save(folder, receipt)
    retention = IMAGES / 'del'
    require(not retention.is_symlink(), 'retention-directory-invalid')
    retention.mkdir(mode=0o700, exist_ok=True)
    require(retention.is_dir() and not retention.is_symlink(), 'retention-directory-invalid')
    batch = retention / receipt['id']
    require(str(batch) == receipt['retention'] and len(receipt['files']) == len(receipt['moves']),
            'retention-plan-invalid')
    batch.mkdir(mode=0o700)
    for row, move in zip(receipt['files'], receipt['moves']):
        source, target = Path(move['source']), Path(move['destination'])
        expected_target = batch / ('images' if source.parent == IMAGES else 'workspace-root') / source.name
        require(source == Path(row['path']) and target == expected_target, 'retention-plan-invalid')
        target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        require(same_file(row, record(source)), 'old-file-changed-before-retention')
        move['state'] = 'moving'
        save(folder, receipt)
        move_without_replace(source, target)
        move['state'] = 'moved'
        save(folder, receipt)
    require(summary(request) == receipt['containers'], 'post-delivery-runtime-drift')
    remaining = {row['path']: row for row in current_files()}
    expected_paths = {str(destination), str(destination) + '.sha256', str(destination) + '.manifest.json'}
    require(set(remaining) == expected_paths, 'unexpected-image-files-after-retention')
    require(remaining[str(destination)]['sha256'] == exported['sha256'], 'published-delivery-sha-mismatch')
    receipt['phase'] = 'complete'
    save(folder, receipt)
    return delivery_summary(receipt)


def run(request):
    os.umask(0o077)
    check_scope(request)
    action = request.get('action', 'plan')
    require(action in ('plan', 'apply'), 'delivery-action-refused')
    require(action == 'plan' or request.get('confirm') is True, 'explicit-delivery-confirmation-required')
    parent = OPS / 'harness-image-deliveries'
    parent.mkdir(mode=0o700, exist_ok=True)
    require(not parent.is_symlink() and parent.stat().st_mode & 0o077 == 0, 'private-receipt-directory-invalid')
    with (OPS / 'harness.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if action == 'plan':
            return plan(request, parent)
        identity = request.get('receiptId', '')
        require(re.fullmatch(r'[0-9a-f]{32}', identity), 'delivery-receipt-required')
        folder = parent / identity
        require(folder.is_dir() and not folder.is_symlink(), 'delivery-receipt-invalid')
        receipt = json.loads((folder / 'receipt.json').read_bytes())
        require(receipt['id'] == identity and receipt['phase'] == 'planned', 'delivery-not-planned')
        frozen(request, receipt)
        receipt['phase'] = 'exporting'
        save(folder, receipt)
        fcntl.flock(lock, fcntl.LOCK_UN)
        try:
            exported = operations().perform({'service': request['service'], 'key': 'harness', 'operation': 'export',
                'image_directory': str(IMAGES), 'ops_directory': str(OPS)})
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            return publish(request, folder, receipt, exported)
        except BaseException as error:
            receipt['phase'] = 'incomplete'
            receipt['errorType'] = type(error).__name__
            if isinstance(error, DeliveryError):
                receipt['errorCode'] = str(error)
            save(folder, receipt)
            raise


if __name__ == '__main__':
    try:
        print(json.dumps(run(json.load(sys.stdin))))
    except BaseException as error:
        print(json.dumps({'verified': False, 'errorType': type(error).__name__,
                          'errorCode': str(error) if isinstance(error, DeliveryError) else 'delivery-failed-check-private-receipt'}))
        sys.exit(1)
