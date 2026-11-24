#!/usr/bin/env python3
"""Read packaged code using disposable image containers without user-data mounts."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tarfile
import uuid

ROOT = Path('/home/ubuntu/Workspace/huaqing-harness')
SOCKET = 'unix:///run/user/1001/huaqing-docker/docker.sock'
PACKAGES = (
    'dsh-system-prompt', 'dsh-harness-dev-context', 'dsh-web-app', 'dsh-team-app',
    'dsh-host-team-runtime', 'dsh-host-team-server', 'dsh-client-ui-brand-official',
    'dsh-client-ui-settings-account', 'dsh-client-ui-settings-models',
    'dsh-client-ui-plugin-manager', 'dsh-client-ui-sidebar-documentpreview',
    'dsh-web-frontend',
)
FIND_PACKAGES = r"""
const fs = require('node:fs');
const path = require('node:path');
const wanted = new Set(JSON.parse(process.argv[1]));
const found = {};
const queue = ['/opt/dsh'];
while (queue.length) {
  const directory = queue.pop();
  for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) queue.push(filename);
    else if (entry.isFile() && entry.name === 'package.json') {
      let manifest;
      try { manifest = JSON.parse(fs.readFileSync(filename, 'utf8')); }
      catch (error) { continue; }
      if (typeof manifest.name === 'string' && wanted.has(manifest.name)) {
        (found[manifest.name] ??= []).push(directory);
      }
    }
  }
}
process.stdout.write(JSON.stringify(found));
"""


def require(value, code):
    if not value:
        raise RuntimeError(code)


def command(argv, optional=False):
    result = subprocess.run(argv, capture_output=True, text=True, timeout=120)
    if result.returncode and not optional:
        raise RuntimeError('code-extraction-command-failed')
    return result


def run(request):
    os.umask(0o077)
    service = request['service']
    component = request['component']
    require(service['directory'] == str(ROOT) and service['docker_socket'] == SOCKET,
            'application-scope-refused')
    require(component in service['containers'] and (
        component == 'huaqing-team-gateway' or re.fullmatch(r'hqzy-[0-9a-f-]{36}', component)),
        'component-refused')
    docker = ['docker', '--host', SOCKET]
    actual = json.loads(command(docker + ['inspect', component]).stdout)[0]
    image_id = actual['Image']
    require(image_id == service['observed_images'][component], 'inventory-image-drift')
    image = json.loads(command(docker + ['image', 'inspect', image_id]).stdout)[0]
    require(image['Os'] == 'linux' and image['Architecture'] == 'amd64', 'image-platform-refused')
    require(not image['Config'].get('Volumes'), 'image-declared-volumes-refused')
    discovered = json.loads(command(docker + ['run', '--rm', '--network', 'none',
        '--read-only', '--user', '0:0', '--cap-drop', 'ALL', '--security-opt',
        'no-new-privileges:true', '--entrypoint', 'node', image_id, '-e', FIND_PACKAGES,
        json.dumps(['@deepseek-ai/' + package for package in PACKAGES])]).stdout)
    folder = ROOT / 'ops' / 'brand-code' / uuid.uuid4().hex
    folder.mkdir(parents=True, mode=0o700)
    require(not folder.is_symlink(), 'code-directory-invalid')
    content = folder / 'code'
    content.mkdir(mode=0o700)
    temporary = 'hqzy-brand-inspect-' + uuid.uuid4().hex
    container_id = command(docker + ['create', '--name', temporary, '--network', 'none',
        '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
        '--entrypoint', '/bin/true', image_id]).stdout.strip()
    require(re.fullmatch(r'[0-9a-f]{64}', container_id), 'temporary-container-id-invalid')
    missing = []
    locations = {}
    try:
        for package in PACKAGES:
            paths = discovered.get('@deepseek-ai/' + package, [])
            if not paths:
                missing.append(package)
                continue
            require(len(paths) == 1, 'multiple-packaged-versions-require-review')
            selected = paths[0]
            require(selected.startswith('/opt/dsh/') and '/..' not in selected,
                    'packaged-code-path-invalid')
            locations[package] = selected
            destination = content / package
            destination.mkdir(mode=0o700)
            origin = f'{container_id}:{selected}'
            copied = command(docker + ['cp', origin + '/package.json', str(destination)], optional=True)
            if copied.returncode:
                missing.append(package)
                continue
            for child in ('lib', 'locale', 'dist'):
                command(docker + ['cp', origin + '/' + child, str(destination)], optional=True)
    finally:
        command(docker + ['rm', container_id])
    require('dsh-system-prompt' not in missing, 'prompt-package-missing')
    files = {}
    total = 0
    for path in content.rglob('*'):
        require(not path.is_symlink(), 'packaged-code-symlink-refused')
        if path.is_file():
            size = path.stat().st_size
            total += size
            require(total <= 150 * 1024**2, 'packaged-code-too-large')
            files[str(path.relative_to(content))] = hashlib.sha256(path.read_bytes()).hexdigest()
    manifest = {'schema': 1, 'component': component, 'imageId': image_id,
                'missingPackages': missing, 'imagePaths': locations, 'files': files, 'bytes': total}
    (content / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    archive = folder / 'public-code.tar.gz'
    with tarfile.open(archive, 'w:gz') as output:
        for path in sorted(content.rglob('*')):
            if path.is_file():
                output.add(path, arcname=str(path.relative_to(content)), recursive=False)
    return {'verified': True, 'component': component, 'imageId': image_id,
            'archive': str(archive), 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
            'codeBytes': total, 'fileCount': len(files), 'missingPackages': missing}


if __name__ == '__main__':
    try:
        result = run(json.load(sys.stdin))
    except Exception as error:
        result = {'verified': False, 'errorType': type(error).__name__}
        if isinstance(error, RuntimeError):
            result['errorCode'] = str(error)
    print(json.dumps(result))
    sys.exit(0 if result.get('verified') else 1)
