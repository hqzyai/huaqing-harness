#!/usr/bin/env python3
"""Package verified branding artifacts over the audited deployed images."""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import tarfile

ROOT = Path(__file__).resolve().parents[3]
BASES = {
    'gateway': '4c7256f2756c7284f21407fb895cacca924ec019605c7f88ea4ed454a6924327',
    'worker': '36b3ba389e32b26a210f8d0cbf468599fe24955b39892de667cbcf7d29b1228b',
}
SOURCES = {'dsh-system-prompt': 'packages/core/system-prompt',
           'dsh-harness-dev-context': 'packages/context/harness-dev-context'}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base-root', type=Path, required=True)
    parser.add_argument('--destination', type=Path, required=True)
    args = parser.parse_args()
    before = {}
    locations = {}
    for kind, identity in BASES.items():
        base = args.base_root / (kind + '-current')
        manifest = json.loads((base / 'manifest.json').read_text())
        assert manifest['imageId'] == 'sha256:' + identity
        for name in SOURCES:
            content = (base / name / 'lib/index.js').read_bytes()
            location = manifest['imagePaths'][name].removeprefix('/opt/dsh/') + '/lib/index.js'
            assert location.startswith('node_modules/') and '..' not in location
            assert name not in before or before[name] == content
            assert name not in locations or locations[name] == location
            before[name], locations[name] = content, location
    payloads = {'apply-brand.mjs': Path(__file__).with_name('apply-brand.mjs').read_bytes()}
    modules = []
    for name, source in SOURCES.items():
        after = (ROOT / source / 'lib/index.js').read_bytes()
        assert b'Huaqing Harness' in after
        if name == 'dsh-harness-dev-context':
            assert b'stateVersion: 2' in after
        payload = name + '.js'
        payloads[payload] = after
        modules.append({'path': locations[name], 'beforeSHA256': digest(before[name]),
                        'afterSHA256': digest(after), 'payload': payload})
    payloads['payload.json'] = (json.dumps({'product': 'Huaqing Harness', 'modules': modules}, indent=2) + '\n').encode()
    for kind, identity in BASES.items():
        recipe = f'FROM huaqing-team-{kind}:branding-base-{identity[:12]}\n'
        # The gateway inherits its original image user, including the empty
        # root default; an explicit USER changes Docker's stored configuration.
        if kind == 'worker':
            recipe += 'USER root\n'
        recipe += 'COPY apply-brand.mjs payload.json dsh-system-prompt.js dsh-harness-dev-context.js /tmp/huaqing-brand-update/\n'
        recipe += 'RUN node /tmp/huaqing-brand-update/apply-brand.mjs && rm -rf /tmp/huaqing-brand-update\n'
        if kind == 'worker':
            recipe += 'USER node\n'
        recipe += 'LABEL com.hqzy.product="Huaqing Harness" com.hqzy.update="branding-20261103"\n'
        payloads['Dockerfile.' + kind] = recipe.encode()
    args.destination.parent.mkdir(parents=True, exist_ok=True)
    with args.destination.open('wb') as output:
        with gzip.GzipFile(filename='', mode='wb', fileobj=output, mtime=0) as compressed:
            with tarfile.open(fileobj=compressed, mode='w') as archive:
                for name, content in sorted(payloads.items()):
                    entry = tarfile.TarInfo(name)
                    entry.size, entry.mode, entry.mtime = len(content), 0o644, 0
                    archive.addfile(entry, io.BytesIO(content))
    print(json.dumps({'path': str(args.destination.resolve()), 'bytes': args.destination.stat().st_size,
                      'sha256': digest(args.destination.read_bytes()), 'modules': len(modules)}))


if __name__ == '__main__':
    main()
