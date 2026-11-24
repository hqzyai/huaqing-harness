#!/usr/bin/env python3
"""Read only allowlisted release receipt fields and public container lifecycle metadata."""
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path('/home/ubuntu/Workspace/huaqing-harness/ops/brand-release')
DOCKER = ['docker', '--host', 'unix:///run/user/1001/huaqing-docker/docker.sock']


def edge_network(container):
    text = container['State'].get('Error', '').lower()
    if 'network' in text and ('not found' in text or 'does not exist' in text):
        error_code = 'network-not-found'
    elif 'cannot assign requested address' in text:
        error_code = 'bind-address-unavailable'
    elif 'already in use' in text or 'already allocated' in text:
        error_code = 'address-in-use'
    elif not text:
        error_code = None
    else:
        error_code = 'unclassified-runtime-error'
    mode = container['HostConfig']['NetworkMode']
    assert mode == 'huaqing-team-control', 'edge-network-scope-invalid'
    request = subprocess.run(DOCKER + ['network', 'inspect', mode],
                             capture_output=True, text=True, timeout=15)
    current = json.loads(request.stdout)[0] if request.returncode == 0 else None
    attachments = container['NetworkSettings']['Networks']
    old = attachments.get(mode, {})
    return {'runtimeErrorCode': error_code, 'networkName': mode,
            'recordedNetworkId': old.get('NetworkID'), 'recordedIPv4': old.get('IPAddress'),
            'configuredIPv4': (old.get('IPAMConfig') or {}).get('IPv4Address'),
            'currentNetworkId': current['Id'] if current else None,
            'networkIdentityMatches': bool(current and old.get('NetworkID') == current['Id']),
            'staticAddressOccupants': [{'name': value['Name'], 'containerId': identity,
                                        'ipv4': value['IPv4Address']}
                for identity, value in (current or {}).get('Containers', {}).items()
                if value.get('IPv4Address', '').split('/')[0] == '10.241.0.2']}


def public_state(container):
    state = container['State']
    return {'id': container['Id'], 'name': container['Name'].lstrip('/'), 'imageId': container['Image'],
            'running': state['Running'], 'exitCode': state['ExitCode'],
            'startedAt': state['StartedAt'], 'finishedAt': state['FinishedAt'],
            'hasRuntimeError': bool(state.get('Error')), 'restartCount': container['RestartCount']}


def run(receipt_id):
    assert re.fullmatch(r'[0-9a-f]{32}', receipt_id), 'receipt-id-invalid'
    receipt = json.loads((ROOT / receipt_id / 'receipt.json').read_bytes())
    assert receipt['id'] == receipt_id and receipt['schema'] == 1, 'receipt-invalid'
    result = {'receiptId': receipt_id, 'phase': receipt['phase'],
              'replacementIds': receipt.get('replacementIds', {}),
              'newGatewayId': receipt.get('newGatewayId'), 'containers': []}
    image = subprocess.run(DOCKER + ['image', 'inspect', receipt['candidateGateway']],
                           capture_output=True, text=True, timeout=15)
    if image.returncode == 0:
        candidate = json.loads(image.stdout)[0]
        result['gatewayUserComparison'] = {'originalContainerUser': receipt['gateway']['Config'].get('User'),
                                          'candidateImageUser': candidate['Config'].get('User')}
    names = ['huaqing-team-gateway', 'huaqing-team-edge']
    for worker in receipt['workers']:
        name = worker['Name'].lstrip('/')
        assert re.fullmatch(r'hqzy-[0-9a-f-]{36}', name), 'worker-name-invalid'
        names += [name, name + '-brand-rollback-' + receipt_id[:8], name + '-brand-failed-' + receipt_id[:8]]
    for name in names:
        selected = subprocess.run(DOCKER + ['inspect', name], capture_output=True, text=True, timeout=15)
        if selected.returncode == 0:
            actual = json.loads(selected.stdout)[0]
            state = public_state(actual)
            if name == 'huaqing-team-edge':
                result['edgeNetwork'] = edge_network(actual)
            if '-brand-failed-' in name:
                original = next(row for row in receipt['workers'] if name.startswith(row['Name'].lstrip('/') + '-brand-failed-'))
                fields = ('User', 'WorkingDir', 'Entrypoint', 'Cmd')
                state['differentConfigFields'] = [key for key in fields
                                                  if actual['Config'].get(key) != original['Config'].get(key)]
                host_fields = ('Privileged', 'CapAdd', 'CapDrop', 'SecurityOpt', 'ReadonlyRootfs',
                               'PidsLimit', 'Memory', 'MemorySwap', 'NanoCpus', 'NetworkMode',
                               'Tmpfs', 'PortBindings', 'ExtraHosts', 'RestartPolicy', 'IpcMode', 'PidMode', 'CgroupnsMode')
                state['differentHostConfigFields'] = [key for key in host_fields
                                                      if actual['HostConfig'].get(key) != original['HostConfig'].get(key)]
                before_env = dict(row.split('=', 1) for row in original['Config']['Env'])
                after_env = dict(row.split('=', 1) for row in actual['Config']['Env'])
                state['differentEnvironmentNames'] = sorted(key for key in set(before_env) | set(after_env)
                                                            if before_env.get(key) != after_env.get(key))
            result['containers'].append(state)
    return result


if __name__ == '__main__':
    try:
        print(json.dumps(run(json.load(sys.stdin)['receiptId'])))
    except Exception as error:
        print(json.dumps({'errorType': type(error).__name__, 'verified': False}))
        sys.exit(1)
