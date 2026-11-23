#!/usr/bin/env python3
"""Move only the stopped original Harness edge off an occupied private address."""
import copy
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import re
import stat
import sys
import uuid

SPEC = importlib.util.spec_from_file_location('harness_release', Path(__file__).with_name('brand-release.py'))
release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release)
ROOT = release.ROOT
COMPOSE = release.COMPOSE
DOCKER = release.DOCKER
OLD_IP, NEW_IP, NETWORK = '10.241.0.2', '10.241.0.5', 'huaqing-team-control'
CHANGES = ['services.edge.networks.control.ipv4_address', 'services.gateway.environment.TEAM_TRUSTED_PROXY_IPS']


def changed_paths(before, after, prefix=''):
    if isinstance(before, dict) and isinstance(after, dict) and before.keys() == after.keys():
        return [path for key in before for path in changed_paths(before[key], after[key], prefix + '.' + key if prefix else key)]
    return [] if before == after else [prefix]


def candidate(before):
    after = copy.deepcopy(before)
    release.require(set(before['services']) == {'gateway', 'edge'}, 'two-service-compose-required')
    release.require(before['services']['edge']['networks']['control']['ipv4_address'] == OLD_IP, 'old-edge-address-drift')
    trust = before['services']['gateway']['environment']['TEAM_TRUSTED_PROXY_IPS']
    release.require(isinstance(trust, str), 'gateway-trust-string-required')
    replacement, count = re.subn(r'(?<![0-9.])10\.241\.0\.2(?![0-9.])', NEW_IP, trust)
    release.require(count == 1, 'exactly-one-old-edge-trust-required')
    after['services']['edge']['networks']['control']['ipv4_address'] = NEW_IP
    after['services']['gateway']['environment']['TEAM_TRUSTED_PROXY_IPS'] = replacement
    release.require(sorted(changed_paths(before, after)) == sorted(CHANGES), 'unexpected-compose-change')
    return after


def compose(*args):
    return release.command(DOCKER + ['compose', '--project-directory', str(ROOT), '-p', 'huaqing-team',
                                    '-f', str(COMPOSE), *args], timeout=180)


def network():
    return json.loads(release.command(DOCKER + ['network', 'inspect', NETWORK]))[0]


def free_address(current):
    release.require(not any(row.get('IPv4Address', '').split('/')[0] == NEW_IP
                            for row in current.get('Containers', {}).values()), 'new-edge-address-occupied')


def gateway_source_matches(container):
    identity = compose('config', '--hash', 'gateway').split()
    release.require(len(identity) == 2 and identity[0] == 'gateway'
                    and identity[1] == container['Config']['Labels'].get('com.docker.compose.config-hash'),
                    'compose-live-config-hash-mismatch')
    source = json.loads(COMPOSE.read_bytes())['services']['gateway']
    image = json.loads(release.command(DOCKER + ['image', 'inspect', source['image']]))[0]
    release.require(image['Id'] == container['Image'], 'compose-gateway-image-drift')
    expected = dict(row.split('=', 1) for row in image['Config'].get('Env', []))
    expected.update(source.get('environment', {}))
    release.require(expected == dict(row.split('=', 1) for row in container['Config']['Env']),
                    'compose-gateway-environment-drift')


def public_state(container):
    return {'id': container['Id'], 'imageId': container['Image'],
            'startedAt': container['State']['StartedAt'], 'running': container['State']['Running']}


def frozen_workers(receipt):
    current = release.workers()
    release.require({row['Id'] for row in current} == {row['Id'] for row in receipt['workers']}, 'worker-roster-drift')
    for before in receipt['workers']:
        release.frozen(before, next(row for row in current if row['Id'] == before['Id']))


def plan(service, parent):
    gateway, edge = release.inspect(release.GATEWAY), release.inspect(release.EDGE)
    release.require(not edge['State']['Running'], 'stopped-edge-required')
    release.require(gateway['State']['Running'] and gateway['State'].get('Health', {}).get('Status') == 'healthy',
                    'healthy-gateway-required')
    for row in (gateway, edge):
        release.require(row['Image'] == service['observed_images'][row['Name'].lstrip('/')], 'inventory-image-drift')
        release.require(not release.missing_mounts(row), 'missing-bind-source')
    current_network = network()
    free_address(current_network)
    gateway_source_matches(gateway)
    workers = release.workers()
    for worker in workers:
        release.require(not release.missing_mounts(worker), 'missing-bind-source')
        if worker['State']['Running']:
            release.activity(worker)
    help_text = release.command(DOCKER + ['compose', 'create', '--help'])
    release.require(all(flag in help_text for flag in ('--force-recreate', '--no-build', '--pull')),
                    'rollback-compose-create-unsupported')
    before = COMPOSE.read_bytes()
    proposed = release.encoded(candidate(json.loads(before))) + b'\n'
    receipt_id = uuid.uuid4().hex
    folder = parent / receipt_id
    folder.mkdir(mode=0o700)
    release.atomic(folder / 'compose.before.json', before)
    release.atomic(folder / 'compose.candidate.json', proposed)
    release.command(DOCKER + ['compose', '--project-directory', str(ROOT), '-p', 'huaqing-team',
                             '-f', str(folder / 'compose.candidate.json'), 'config', '--quiet'])
    unrelated = [public_state(release.inspect(identity)) for identity, row in current_network.get('Containers', {}).items()
                 if row.get('IPv4Address', '').split('/')[0] == OLD_IP and identity != edge['Id']]
    receipt = {'schema': 1, 'id': receipt_id, 'phase': 'planned', 'gateway': gateway, 'edge': edge,
               'workers': workers, 'unrelated': unrelated, 'networkId': current_network['Id'],
               'composeSha256': release.sha(before), 'candidateSha256': release.sha(proposed),
               'composeMode': stat.S_IMODE(COMPOSE.stat().st_mode)}
    release.save(folder, receipt)
    return summary(receipt)


def summary(receipt):
    return {'verified': True, 'receiptId': receipt['id'], 'phase': receipt['phase'],
            'oldEdgeIP': OLD_IP, 'newEdgeIP': NEW_IP, 'changedFields': CHANGES,
            'gatewayImage': receipt['gateway']['Image'], 'edgeImage': receipt['edge']['Image'],
            'workerIds': [row['Id'] for row in receipt['workers']],
            'composeBeforeSha256': receipt['composeSha256'], 'edgeFrozenAfterRepair': receipt['phase'] == 'verified-edge-stopped'}


def verify_preserved(receipt, moved):
    gateway, edge = release.healthy(release.GATEWAY), release.inspect(release.EDGE)
    for current, before in ((gateway, receipt['gateway']), (edge, receipt['edge'])):
        release.require(current['Image'] == before['Image'], 'repair-image-drift')
        release.require(release.runtime_settings(current) == release.runtime_settings(before), 'repair-runtime-settings-drift',
                        release.runtime_differences(before, current))
    expected = dict(row.split('=', 1) for row in receipt['gateway']['Config']['Env'])
    if moved:
        expected['TEAM_TRUSTED_PROXY_IPS'] = json.loads((ROOT / 'ops/edge-address-repair' / receipt['id'] /
            'compose.candidate.json').read_bytes())['services']['gateway']['environment']['TEAM_TRUSTED_PROXY_IPS']
    release.require(expected == dict(row.split('=', 1) for row in gateway['Config']['Env']), 'repair-gateway-environment-drift')
    release.require(release.environment(edge) == release.environment(receipt['edge']), 'repair-edge-environment-drift')
    frozen_workers(receipt)
    for before in receipt['unrelated']:
        release.require(public_state(release.inspect(before['id'])) == before, 'unrelated-network-member-changed')
    if moved:
        endpoint = edge['NetworkSettings']['Networks'].get(NETWORK, {})
        release.require(endpoint.get('IPAddress') == NEW_IP and endpoint.get('NetworkID') == receipt['networkId'],
                        'new-edge-endpoint-not-ready')


def rollback(folder, receipt):
    current = release.inspect(release.EDGE)
    if current['State']['Running']:
        release.command(DOCKER + ['stop', '--time', '30', current['Id']])
    before = (folder / 'compose.before.json').read_bytes()
    release.require(release.sha(before) == receipt['composeSha256'], 'repair-backup-corrupt')
    release.atomic(COMPOSE, before, receipt['composeMode'])
    # Create restores the original stopped edge without trying its occupied IP.
    # The source has exactly these two services, so no other application is selected.
    compose('create', '--no-build', '--pull', 'never', '--force-recreate', 'edge')
    compose('up', '-d', '--no-deps', '--no-build', '--pull', 'never', '--force-recreate', 'gateway')
    release.require(not release.inspect(release.EDGE)['State']['Running'], 'rollback-edge-must-be-stopped')
    verify_preserved(receipt, moved=False)
    receipt['phase'] = 'rolled-back'
    release.save(folder, receipt)
    return summary(receipt)


def apply(folder, receipt):
    release.require(receipt['phase'] == 'planned', 'repair-not-planned')
    release.require(release.sha(COMPOSE.read_bytes()) == receipt['composeSha256'], 'repair-compose-drift')
    for before in (receipt['gateway'], receipt['edge']):
        release.frozen(before, release.inspect(before['Id']))
        release.require(not release.missing_mounts(before), 'missing-bind-source')
    frozen_workers(receipt)
    for worker in receipt['workers']:
        if worker['State']['Running']:
            release.activity(worker)
    current_network = network()
    release.require(current_network['Id'] == receipt['networkId'], 'repair-network-drift')
    free_address(current_network)
    proposed = (folder / 'compose.candidate.json').read_bytes()
    release.require(release.sha(proposed) == receipt['candidateSha256'], 'repair-candidate-corrupt')
    receipt['phase'] = 'applying'
    release.save(folder, receipt)
    phase = 'update-compose'
    try:
        release.atomic(COMPOSE, proposed, receipt['composeMode'])
        phase = 'recreate-gateway-and-edge'
        compose('up', '-d', '--no-deps', '--no-build', '--pull', 'never', '--force-recreate', 'gateway', 'edge')
        phase = 'verify-runtime-preservation'
        verify_preserved(receipt, moved=True)
        phase = 'public-health'
        release.endpoint_healthy()
        phase = 'freeze-edge'
        release.command(DOCKER + ['stop', '--time', '30', release.EDGE])
        release.require(not release.inspect(release.EDGE)['State']['Running'], 'edge-freeze-failed')
        frozen_workers(receipt)
        release.healthy(release.GATEWAY)
        receipt['phase'] = 'verified-edge-stopped'
        release.save(folder, receipt)
        return summary(receipt)
    except Exception as error:
        receipt['failure'] = release.failure_metadata(error, phase)
        release.save(folder, receipt)
        try:
            rollback(folder, receipt)
        except Exception as rollback_error:
            receipt['phase'] = 'rollback-incomplete'
            receipt['rollbackFailure'] = release.failure_metadata(rollback_error, 'rollback')
            release.save(folder, receipt)
            raise release.ReleaseApplyError('edge-repair-failed-rollback-incomplete', receipt['failure']) from None
        raise release.ReleaseApplyError('edge-repair-failed-original-restored', receipt['failure']) from None


def run(request):
    os.umask(0o077)
    service = request['service']
    release.require(service['directory'] == str(ROOT) and service['docker_socket'] == release.SOCKET
                    and service['compose_files'] == [str(COMPOSE)] and service['port'] == 28003,
                    'edge-repair-scope-refused')
    action = request.get('action', 'plan')
    release.require(action in ('plan', 'apply', 'rollback'), 'edge-repair-action-refused')
    release.require(action == 'plan' or request.get('confirm') is True, 'edge-repair-confirmation-required')
    parent = ROOT / 'ops/edge-address-repair'
    parent.mkdir(mode=0o700, exist_ok=True)
    release.require(not parent.is_symlink() and parent.stat().st_mode & 0o077 == 0, 'private-repair-directory-invalid')
    descriptor = os.open(ROOT.parent / '.ansible-ops/harness.lock', os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, 'r+') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if action == 'plan':
            return plan(service, parent)
        receipt_id = request.get('receiptId', '')
        release.require(re.fullmatch(r'[0-9a-f]{32}', receipt_id), 'repair-receipt-required')
        folder = parent / receipt_id
        receipt = json.loads((folder / 'receipt.json').read_bytes())
        release.require(receipt['id'] == receipt_id and receipt['schema'] == 1, 'repair-receipt-invalid')
        return apply(folder, receipt) if action == 'apply' else rollback(folder, receipt)


if __name__ == '__main__':
    try:
        result = run(json.load(sys.stdin))
    except Exception as error:
        result = {'verified': False, **release.failure_metadata(error, 'edge-address-repair')}
        if isinstance(error, release.ReleaseApplyError):
            result['errorCode'] = str(error)
            result['failure'] = error.failure
    print(json.dumps(result))
    sys.exit(0 if result.get('verified') else 1)
