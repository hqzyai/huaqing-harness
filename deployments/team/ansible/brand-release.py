#!/usr/bin/env python3
"""Publish pinned Harness images through its existing Compose configuration.

Only the original workstation's Harness is supported. Receipts contain private
Docker configuration and remain on the server. Worker Config, HostConfig and
network endpoints are copied from the pinned old container; only Image changes.
Old containers stay stopped for rollback. User volumes, keys, database files and
other applications are untouched.
"""
import copy
import fcntl
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import socket
import stat
import subprocess
import sys
import time
import urllib.request
import urllib.parse
import uuid

ROOT = Path('/home/ubuntu/Workspace/huaqing-harness')
SOCKET = 'unix:///run/user/1001/huaqing-docker/docker.sock'
COMPOSE = ROOT / 'ops/compose.switch.json'
DOCKER = ['docker', '--host', SOCKET]
GATEWAY = 'huaqing-team-gateway'
EDGE = 'huaqing-team-edge'
WORKER = re.compile(r'hqzy-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
IMAGE = re.compile(r'sha256:[0-9a-f]{64}')
HOST_FIELDS = (
    'Privileged', 'CapAdd', 'CapDrop', 'SecurityOpt', 'ReadonlyRootfs', 'PidsLimit',
    'Memory', 'MemorySwap', 'NanoCpus', 'NetworkMode', 'Tmpfs', 'PortBindings',
    'ExtraHosts', 'RestartPolicy', 'IpcMode', 'PidMode', 'CgroupnsMode',
)
CONFIG_FIELDS = ('User', 'WorkingDir', 'Entrypoint', 'Cmd')
PHASE = 'preflight'


class ReleaseInvariantError(RuntimeError):
    """A fixed maintenance rejection with optional public property names."""

    def __init__(self, code, fields=()):
        super().__init__(code)
        self.fields = list(fields)


class ReleaseApplyError(RuntimeError):
    """Keep the original sanitized failure after attempted recovery."""

    def __init__(self, code, failure):
        super().__init__(code)
        self.failure = failure


class DeploymentCommandError(RuntimeError):
    """Only allowlisted operation metadata may leave a failed subprocess."""

    def __init__(self, category, returncode, probe_error=None):
        super().__init__('deployment-command-failed')
        self.category = category
        self.returncode = returncode
        self.probe_error = probe_error


def command_category(argv):
    args = argv[len(DOCKER):] if argv[:len(DOCKER)] == DOCKER else []
    if not args:
        return 'unsupported-command'
    operation = args[0]
    if operation == 'compose':
        return 'compose-config' if 'config' in args else 'gateway-compose-up'
    return {'inspect': 'container-inspect', 'image': 'image-inspect', 'ps': 'worker-roster',
            'top': 'worker-process-list', 'exec': 'worker-session-read', 'start': 'container-start',
            'stop': 'container-stop', 'rename': 'container-rename', 'network': 'network-disconnect',
            'version': 'docker-version'}.get(operation, 'unsupported-command')


def require(value, code, fields=()):
    if not value:
        raise ReleaseInvariantError(code, fields)


def failure_metadata(error, phase):
    result = {'phase': phase, 'errorType': type(error).__name__,
              'errorCode': str(error) if isinstance(error, (ReleaseInvariantError, DeploymentCommandError))
              else 'maintenance-operation-failed'}
    if isinstance(error, ReleaseInvariantError) and error.fields:
        result['differentFields'] = error.fields
    if isinstance(error, DeploymentCommandError):
        result.update(commandCategory=error.category, returnCode=error.returncode)
        if error.probe_error:
            result.update(probePhase=error.probe_error['phase'], probeErrorType=error.probe_error['errorType'])
    return result


def command(argv, timeout=120, input=None):
    process = subprocess.run(argv, capture_output=True, text=True, timeout=timeout, input=input)
    if process.returncode:
        category = command_category(argv)
        probe_error = None
        if category == 'worker-session-read' and len(process.stdout) <= 1024:
            try:
                report = json.loads(process.stdout)
                candidate = report.get('probeError') if isinstance(report, dict) else None
                if isinstance(candidate, dict) and set(candidate) == {'phase', 'errorType'} \
                        and candidate['phase'] in ('worker-authentication', 'session-list', 'main-executable', 'proc-read') \
                        and candidate['errorType'] in ('AssertionError', 'TypeError', 'Error', 'AbortError', 'TimeoutError'):
                    probe_error = candidate
            except ValueError:
                # Non-JSON output is never included in the deployment receipt.
                pass
        raise DeploymentCommandError(category, process.returncode, probe_error)
    return process.stdout.strip()


def inspect(identity):
    return json.loads(command(DOCKER + ['inspect', identity]))[0]


def maybe_inspect(name):
    names = command(DOCKER + ['ps', '-aq', '--filter', 'name=^/' + name + '$'])
    return inspect(name) if names else None


def sha(value):
    return hashlib.sha256(value).hexdigest()


def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':')).encode()


def atomic(path, content, mode=0o600):
    temporary = path.with_name(path.name + '.' + uuid.uuid4().hex + '.partial')
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, mode)
    try:
        with os.fdopen(descriptor, 'wb') as output:
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def save(folder, receipt):
    atomic(folder / 'receipt.json', encoded(receipt) + b'\n')


def mounts(container):
    return sorted((row['Type'], row.get('Name', row['Source']), row['Destination'], row['RW'])
                  for row in container['Mounts'])


def runtime_settings(container):
    return {'config': {key: container['Config'].get(key) for key in CONFIG_FIELDS},
            'host': {key: container['HostConfig'].get(key) for key in HOST_FIELDS},
            'mounts': mounts(container)}


def runtime_differences(before, after):
    result = ['Config.' + key for key in CONFIG_FIELDS if before['Config'].get(key) != after['Config'].get(key)]
    result += ['HostConfig.' + key for key in HOST_FIELDS
               if before['HostConfig'].get(key) != after['HostConfig'].get(key)]
    if mounts(before) != mounts(after):
        result.append('Mounts')
    return result


def environment(container, omit=()):
    return sorted(row for row in container['Config']['Env']
                  if row.split('=', 1)[0] not in omit)


def missing_mounts(container):
    return [row['Destination'] for row in container['Mounts']
            if row['Type'] == 'bind' and not Path(row['Source']).exists()]


def frozen(before, after):
    for key in ('Id', 'Image', 'Config', 'HostConfig', 'Mounts'):
        require(before[key] == after[key], 'container-config-drift')
    require(before['State']['StartedAt'] == after['State']['StartedAt']
            and before['State']['Running'] == after['State']['Running'], 'container-state-drift')
    require(before['NetworkSettings']['Networks'] == after['NetworkSettings']['Networks'],
            'container-network-drift')


def image(identity):
    require(isinstance(identity, str) and IMAGE.fullmatch(identity), 'immutable-image-id-required')
    result = json.loads(command(DOCKER + ['image', 'inspect', identity]))[0]
    require(result['Id'] == identity and result['Os'] == 'linux'
            and result['Architecture'] == 'amd64', 'image-platform-or-identity-invalid')
    return result


class LocalDocker(http.client.HTTPConnection):
    """Use only the workstation's fixed local rootless Docker socket."""

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(self.timeout)
        self.sock.connect(SOCKET.removeprefix('unix://'))


def api(method, path, body):
    version = command(DOCKER + ['version', '--format', '{{.Server.APIVersion}}'])
    require(re.fullmatch(r'[0-9]+\.[0-9]+', version), 'docker-api-version-invalid')
    connection = LocalDocker('localhost', timeout=120)
    try:
        connection.request(method, '/v' + version + path, encoded(body),
                           {'Content-Type': 'application/json'})
        response = connection.getresponse()
        raw = response.read(1024 * 1024)
        require(response.status in (200, 201, 204), 'local-docker-operation-failed')
        return json.loads(raw) if raw else {}
    finally:
        connection.close()


def endpoint_config(endpoint):
    """Keep endpoint addresses and aliases, omitting Docker-assigned IDs."""
    result = {key: copy.deepcopy(endpoint[key]) for key in
              ('Links', 'Aliases', 'DriverOpts', 'GwPriority')
              if endpoint.get(key) is not None}
    ipam = copy.deepcopy(endpoint.get('IPAMConfig') or {})
    if endpoint.get('IPAddress'):
        ipam['IPv4Address'] = endpoint['IPAddress']
    if endpoint.get('GlobalIPv6Address'):
        ipam['IPv6Address'] = endpoint['GlobalIPv6Address']
    if ipam:
        result['IPAMConfig'] = ipam
    return result


def disconnect(container):
    for name in container['NetworkSettings']['Networks']:
        command(DOCKER + ['network', 'disconnect', '--force', name, container['Id']])


def reconnect(original):
    actual = inspect(original['Id'])
    for name, endpoint in original['NetworkSettings']['Networks'].items():
        if name not in actual['NetworkSettings']['Networks']:
            api('POST', '/networks/' + urllib.parse.quote(name, safe='') + '/connect',
                {'Container': original['Id'], 'EndpointConfig': endpoint_config(endpoint)})


def clone_worker(previous, identity):
    name = previous['Name'].lstrip('/')
    payload = copy.deepcopy(previous['Config'])
    payload['Image'] = identity
    payload['HostConfig'] = copy.deepcopy(previous['HostConfig'])
    payload['NetworkingConfig'] = {'EndpointsConfig': {
        network: endpoint_config(endpoint)
        for network, endpoint in previous['NetworkSettings']['Networks'].items()}}
    created = api('POST', '/containers/create?name=' + urllib.parse.quote(name, safe=''), payload)
    require(isinstance(created.get('Id'), str) and re.fullmatch(r'[0-9a-f]{64}', created['Id']),
            'created-worker-id-invalid')
    current = inspect(created['Id'])
    require(runtime_settings(current) == runtime_settings(previous), 'cloned-worker-settings-drift',
            runtime_differences(previous, current))
    require(environment(current) == environment(previous), 'cloned-worker-environment-drift')
    return created['Id']


def activity(worker):
    require(worker['State']['Running'], 'activity-worker-not-running')
    source = Path(__file__).with_name('brand-activity.mjs').read_text()
    counts = json.loads(command(DOCKER + ['exec', '-i', worker['Id'], 'node', '--input-type=module'],
                                timeout=40, input=source))
    require(isinstance(counts, dict) and set(counts) == {'total', 'running', 'childProcesses'}
            and type(counts['total']) is int and type(counts['running']) is int
            and type(counts['childProcesses']) is int and counts['childProcesses'] >= 0
            and 0 <= counts['running'] <= counts['total'], 'session-activity-result-invalid')
    require(counts['running'] == 0, 'active-session-refuses-release')
    require(counts['childProcesses'] == 0, 'worker-child-process-refuses-release')


def workers():
    names = command(DOCKER + ['ps', '-a', '--filter', 'label=hqzy.team=hqzy', '--format', '{{.Names}}'])
    owned = [inspect(name) for name in names.splitlines()]
    require(all(WORKER.fullmatch(row['Name'].lstrip('/')) or not row['State']['Running']
                for row in owned), 'noncanonical-owned-worker-running')
    return [row for row in owned if WORKER.fullmatch(row['Name'].lstrip('/'))]


def admission_frozen(receipt):
    require(not inspect(receipt['edge']['Id'])['State']['Running'], 'stopped-edge-required')
    actual = workers()
    require({row['Id'] for row in actual} == {row['Id'] for row in receipt['workers']},
            'worker-roster-drift')
    for previous in receipt['workers']:
        current = next(row for row in actual if row['Id'] == previous['Id'])
        frozen(previous, current)
        if current['State']['Running']:
            activity(current)


def bootstrap_ready(identity):
    deadline = time.monotonic() + 60
    while True:
        current = inspect(identity)
        if current['State']['Running']:
            try:
                activity(current)
                return
            except RuntimeError as error:
                if str(error) in ('active-session-refuses-release', 'worker-child-process-refuses-release'):
                    raise
        require(time.monotonic() < deadline, 'candidate-worker-bootstrap-failed')
        time.sleep(1)


def replacement_admission(receipt):
    require(not inspect(receipt['edge']['Id'])['State']['Running'], 'stopped-edge-required')
    actual = workers()
    require({row['Id'] for row in actual} == set(receipt['replacementIds'].values()),
            'replacement-worker-roster-drift')
    for previous in receipt['workers']:
        current = next(row for row in actual if row['Id'] == receipt['replacementIds'][previous['Id']])
        require(current['Name'] == previous['Name'] and current['Image'] == receipt['candidateWorker'],
                'replacement-worker-identity-drift')
        require(not inspect(previous['Id'])['State']['Running'], 'rollback-worker-unexpectedly-running')
        if previous['State']['Running']:
            activity(current)


def compose_up(service, force=False):
    command(DOCKER + ['compose', '--project-directory', str(ROOT), '-p', 'huaqing-team',
                     '-f', str(COMPOSE), 'up', '-d', '--no-deps', '--no-build',
                     '--pull', 'never'] + (['--force-recreate'] if force else []) + [service], timeout=180)


def healthy(name, timeout=120):
    deadline = time.monotonic() + timeout
    while True:
        current = inspect(name)
        state = current['State']
        if state['Running'] and state.get('Health', {}).get('Status', 'healthy') == 'healthy':
            return current
        require(time.monotonic() < deadline, 'gateway-not-healthy')
        time.sleep(2)


def endpoint_healthy():
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    url = 'http://192.168.2.11:28003/team/health'
    deadline = time.monotonic() + 30
    while True:
        try:
            with opener.open(url, timeout=5) as response:
                require(response.status == 200 and response.geturl() == url
                        and json.loads(response.read(1024)).get('ok') is True, 'ingress-health-failed')
            return
        except (OSError, ValueError, RuntimeError):
            require(time.monotonic() < deadline, 'ingress-health-failed')
            time.sleep(1)


def configure(base, gateway_service, gateway_image, worker_image):
    candidate = json.loads(base)
    gateway = candidate['services'][gateway_service]
    require(isinstance(gateway.get('environment'), dict), 'expanded-compose-environment-required')
    require('TEAM_WORKER_IMAGE' in gateway['environment'], 'worker-image-setting-missing')
    gateway['image'] = gateway_image
    gateway['environment']['TEAM_WORKER_IMAGE'] = worker_image
    return encoded(candidate) + b'\n'


def summary(receipt):
    return {'verified': True, 'receiptId': receipt['id'], 'phase': receipt['phase'],
            'gatewayImage': receipt['candidateGateway'], 'workerImage': receipt['candidateWorker'],
            'workerNames': [row['Name'].lstrip('/') for row in receipt['workers']],
            'edgeInitiallyRunning': receipt['edge']['State']['Running'],
            'composeBeforeSha256': receipt['composeSha256'],
            'businessAcceptanceRequired': receipt['phase'] == 'applied-awaiting-acceptance'}


def rollback(folder, receipt):
    require(sha(COMPOSE.read_bytes()) in (receipt['composeSha256'], receipt['candidateComposeSha256']),
            'rollback-compose-drift')
    current = maybe_inspect(GATEWAY)
    require(current is None or current['Image'] in (receipt['gateway']['Image'], receipt['candidateGateway']),
            'rollback-gateway-image-drift')
    require(not receipt.get('newGatewayId') or current is None
            or current['Id'] in (receipt['gateway']['Id'], receipt['newGatewayId']),
            'rollback-gateway-container-drift')
    edge = inspect(receipt['edge']['Id'])
    if edge['State']['Running']:
        command(DOCKER + ['stop', '--time', '30', edge['Id']])
    for previous in receipt['workers']:
        selected = maybe_inspect(previous['Name'].lstrip('/'))
        if selected and selected['State']['Running']:
            activity(selected)
    backup = (folder / 'compose.before.json').read_bytes()
    require(sha(backup) == receipt['composeSha256'], 'compose-backup-corrupt')
    if current is None or not current['State']['Running']:
        # Restore catalog listeners before restarting original workers.
        atomic(COMPOSE, backup, receipt['composeMode'])
        compose_up(receipt['gatewayService'])
        healthy(GATEWAY)
    for previous in receipt['workers']:
        name = previous['Name'].lstrip('/')
        original = inspect(previous['Id'])
        if original['Name'].lstrip('/') != name:
            candidate = maybe_inspect(name)
            if candidate:
                require(candidate['Image'] == receipt['candidateWorker'], 'rollback-worker-image-drift')
                if candidate['State']['Running']:
                    command(DOCKER + ['stop', '--time', '30', candidate['Id']])
                disconnect(inspect(candidate['Id']))
                failed = name + '-brand-failed-' + receipt['id'][:8]
                require(maybe_inspect(failed) is None, 'rollback-failed-name-exists')
                command(DOCKER + ['rename', candidate['Id'], failed])
            command(DOCKER + ['rename', previous['Id'], name])
        require(runtime_settings(original) == runtime_settings(previous), 'rollback-original-worker-drift')
        reconnect(previous)
        if previous['State']['Running']:
            command(DOCKER + ['start', previous['Id']])
            bootstrap_ready(previous['Id'])
    atomic(COMPOSE, backup, receipt['composeMode'])
    # Recovery may have cached cookies from candidate workers. Recreate only
    # the gateway after original workers publish their new readiness tokens.
    compose_up(receipt['gatewayService'], force=True)
    if receipt['gateway']['State']['Running']:
        restored = healthy(GATEWAY)
        require(restored['Image'] == receipt['gateway']['Image']
                and environment(restored) == environment(receipt['gateway'])
                and runtime_settings(restored) == runtime_settings(receipt['gateway']),
                'rollback-gateway-settings-not-restored')
    else:
        command(DOCKER + ['stop', '--time', '30', GATEWAY])
    if not receipt['edge']['State']['Running']:
        edge = inspect(receipt['edge']['Id'])
        if edge['State']['Running']:
            command(DOCKER + ['stop', '--time', '30', edge['Id']])
    receipt['phase'] = 'rolled-back'
    save(folder, receipt)
    return summary(receipt)


def plan(request, parent):
    global PHASE
    PHASE = 'plan-inspect-source'
    require(COMPOSE.is_file() and not COMPOSE.is_symlink(), 'compose-source-invalid')
    gateway, edge = inspect(GATEWAY), inspect(EDGE)
    require(gateway['State']['Running'] and gateway['State'].get('Health', {}).get('Status') == 'healthy',
            'healthy-original-gateway-required')
    require(not edge['State']['Running'], 'stopped-edge-required')
    PHASE = 'plan-candidate-images'
    candidates = [image(request['gatewayImage']), image(request['workerImage'])]
    require(candidates[0]['Id'] != gateway['Image'], 'gateway-image-unchanged')
    expected = request['service']['observed_images']
    require(gateway['Image'] == expected[GATEWAY] and edge['Image'] == expected[EDGE],
            'inventory-image-drift')
    base_gateway = image(gateway['Image'])
    require(candidates[0]['RootFS']['Layers'][:len(base_gateway['RootFS']['Layers'])]
            == base_gateway['RootFS']['Layers'], 'gateway-base-image-mismatch')
    labels = gateway['Config'].get('Labels', {})
    require(labels.get('com.docker.compose.project') == 'huaqing-team', 'compose-project-invalid')
    gateway_service = labels.get('com.docker.compose.service')
    require(isinstance(gateway_service, str) and re.fullmatch(r'[a-z0-9_-]+', gateway_service),
            'gateway-service-label-invalid')
    PHASE = 'plan-worker-roster'
    prior_workers = workers()
    for worker in prior_workers:
        name = worker['Name'].lstrip('/')
        require(name in expected and worker['Image'] == expected[name], 'worker-inventory-drift')
        require(worker['Image'] != candidates[1]['Id'], 'worker-image-unchanged')
        base_worker = image(worker['Image'])
        require(candidates[1]['RootFS']['Layers'][:len(base_worker['RootFS']['Layers'])]
                == base_worker['RootFS']['Layers'], 'worker-base-image-mismatch')
        require(worker['Config'].get('Labels', {}).get('hqzy.user') == name.removeprefix('hqzy-'),
                'worker-owner-label-invalid')
        require(worker['HostConfig']['ReadonlyRootfs'] and worker['Config']['User'] == '1000:1000',
                'worker-isolation-settings-invalid')
        require(not worker['HostConfig'].get('PortBindings'), 'worker-host-port-refused')
        require(len(worker['NetworkSettings']['Networks']) == 1, 'worker-private-network-required')
    PHASE = 'plan-mount-validation'
    for container in [gateway, edge] + prior_workers:
        require(not missing_mounts(container), 'missing-bind-source')
    # A stopped original edge can be started as part of this application's
    # release. Missing attachments require a separate reviewed recovery task.
    require(bool(edge['NetworkSettings']['Networks']), 'edge-network-attachment-missing')
    before = COMPOSE.read_bytes()
    require(not re.search(rb'(?<!\$)\$(?:\{|[A-Za-z_])', before), 'expanded-compose-required')
    candidate = configure(before, gateway_service, candidates[0]['Id'], candidates[1]['Id'])
    current_definition = json.loads(before)['services'][gateway_service]
    PHASE = 'plan-candidate-user'
    if not current_definition.get('user'):
        require(candidates[0]['Config'].get('User', '') == gateway['Config'].get('User', ''),
                'candidate-gateway-user-drift')
    PHASE = 'plan-compose-hash'
    config_identity = command(DOCKER + ['compose', '--project-directory', str(ROOT), '-p', 'huaqing-team',
        '-f', str(COMPOSE), 'config', '--hash', gateway_service]).split()
    require(len(config_identity) == 2 and config_identity[0] == gateway_service
            and re.fullmatch(r'[0-9a-f]{64}', config_identity[1])
            and config_identity[1] == labels.get('com.docker.compose.config-hash'),
            'compose-live-config-hash-mismatch')
    PHASE = 'plan-live-environment'
    current_image = json.loads(command(DOCKER + ['image', 'inspect', current_definition['image']]))[0]['Id']
    require(current_image == gateway['Image'], 'compose-gateway-image-drift')
    expected_env = dict(row.split('=', 1) for row in base_gateway['Config'].get('Env', []))
    expected_env.update(current_definition.get('environment', {}))
    require(expected_env == dict(row.split('=', 1) for row in gateway['Config']['Env']),
            'compose-gateway-environment-drift')
    receipt_id = uuid.uuid4().hex
    folder = parent / receipt_id
    folder.mkdir(mode=0o700)
    atomic(folder / 'compose.before.json', before)
    atomic(folder / 'compose.candidate.json', candidate)
    PHASE = 'plan-compose-validation'
    command(DOCKER + ['compose', '--project-directory', str(ROOT), '-p', 'huaqing-team',
                     '-f', str(folder / 'compose.candidate.json'), 'config', '--quiet'])
    receipt = {'schema': 1, 'id': receipt_id, 'phase': 'planned', 'gateway': gateway,
               'edge': edge, 'workers': prior_workers, 'gatewayService': gateway_service,
               'candidateGateway': candidates[0]['Id'], 'candidateWorker': candidates[1]['Id'],
               'composeSha256': sha(before), 'candidateComposeSha256': sha(candidate),
               'composeMode': stat.S_IMODE(COMPOSE.stat().st_mode)}
    save(folder, receipt)
    PHASE = 'plan-activity'
    admission_frozen(receipt)
    return summary(receipt)


def apply(folder, receipt):
    global PHASE
    PHASE = 'apply-preflight'
    require(receipt['phase'] == 'planned', 'release-not-in-planned-state')
    require(sha(COMPOSE.read_bytes()) == receipt['composeSha256'], 'compose-drift')
    for before in [receipt['gateway'], receipt['edge']] + receipt['workers']:
        frozen(before, inspect(before['Id']))
        require(not missing_mounts(before), 'missing-bind-source')
    for identity in (receipt['candidateGateway'], receipt['candidateWorker']):
        image(identity)
    candidate = (folder / 'compose.candidate.json').read_bytes()
    require(sha(candidate) == receipt['candidateComposeSha256'], 'candidate-compose-corrupt')
    admission_frozen(receipt)
    receipt['phase'] = 'applying'
    receipt['replacementIds'] = {}
    save(folder, receipt)
    try:
        # Keep the old private catalog listeners available for initial worker
        # startup. The stopped edge prevents new browser admission throughout.
        PHASE = 'apply-admission-check'
        admission_frozen(receipt)
        for previous in receipt['workers']:
            name = previous['Name'].lstrip('/')
            PHASE = 'apply-stop-original-worker'
            if previous['State']['Running']:
                command(DOCKER + ['stop', '--time', '30', previous['Id']])
            PHASE = 'apply-retain-original-worker'
            command(DOCKER + ['rename', previous['Id'], name + '-brand-rollback-' + receipt['id'][:8]])
            PHASE = 'apply-release-original-endpoint'
            disconnect(inspect(previous['Id']))
            PHASE = 'apply-clone-worker'
            created = clone_worker(previous, receipt['candidateWorker'])
            receipt['replacementIds'][previous['Id']] = created
            save(folder, receipt)
            if previous['State']['Running']:
                PHASE = 'apply-bootstrap-worker'
                command(DOCKER + ['start', created])
                bootstrap_ready(created)
        PHASE = 'apply-replacement-admission-check'
        replacement_admission(receipt)
        if receipt['gateway']['State']['Running']:
            PHASE = 'apply-stop-gateway'
            command(DOCKER + ['stop', '--time', '30', GATEWAY])
        PHASE = 'apply-replacement-check-after-gateway-stop'
        replacement_admission(receipt)
        PHASE = 'apply-update-compose'
        atomic(COMPOSE, candidate, receipt['composeMode'])
        PHASE = 'apply-start-gateway'
        compose_up(receipt['gatewayService'])
        receipt['newGatewayId'] = inspect(GATEWAY)['Id']
        save(folder, receipt)
        PHASE = 'apply-gateway-health'
        healthy(GATEWAY)
        PHASE = 'apply-preserve-runtime'
        check_runtime(receipt)
        edge = inspect(receipt['edge']['Id'])
        if not edge['State']['Running']:
            PHASE = 'apply-start-edge'
            command(DOCKER + ['start', edge['Id']])
        PHASE = 'apply-ingress-health'
        endpoint_healthy()
        receipt['phase'] = 'applied-awaiting-acceptance'
        save(folder, receipt)
        return summary(receipt)
    except Exception as error:
        receipt['failure'] = failure_metadata(error, PHASE)
        save(folder, receipt)
        try:
            rollback(folder, receipt)
        except Exception as rollback_error:
            receipt['phase'] = 'rollback-incomplete'
            receipt['rollbackFailure'] = failure_metadata(rollback_error, 'rollback')
            save(folder, receipt)
            raise ReleaseApplyError('apply-failed-rollback-incomplete', receipt['failure']) from None
        raise ReleaseApplyError('apply-failed-original-deployment-restored', receipt['failure']) from None


def check_runtime(receipt):
    require(sha(COMPOSE.read_bytes()) == receipt['candidateComposeSha256'], 'candidate-compose-drift')
    gateway = healthy(GATEWAY)
    require(gateway['Id'] == receipt['newGatewayId'] and gateway['Image'] == receipt['candidateGateway'],
            'candidate-gateway-drift')
    require(runtime_settings(gateway) == runtime_settings(receipt['gateway']), 'gateway-runtime-settings-drift',
            runtime_differences(receipt['gateway'], gateway))
    require(environment(gateway, ('TEAM_WORKER_IMAGE',))
            == environment(receipt['gateway'], ('TEAM_WORKER_IMAGE',)), 'gateway-environment-drift')
    worker_ids = []
    for previous in receipt['workers']:
        current = maybe_inspect(previous['Name'].lstrip('/'))
        if current is None:
            require(not previous['State']['Running'], 'active-worker-not-recreated')
            continue
        require(current['Image'] == receipt['candidateWorker'], 'candidate-worker-image-drift')
        require(runtime_settings(current) == runtime_settings(previous), 'worker-runtime-settings-drift',
                runtime_differences(previous, current))
        require(environment(current) == environment(previous), 'worker-environment-drift')
        require(set(current['NetworkSettings']['Networks']) == set(previous['NetworkSettings']['Networks']),
                'worker-network-drift')
        for name, endpoint in previous['NetworkSettings']['Networks'].items():
            actual_endpoint = current['NetworkSettings']['Networks'][name]
            require(actual_endpoint['IPAddress'] == endpoint['IPAddress']
                    and actual_endpoint.get('Aliases') == endpoint.get('Aliases'), 'worker-network-address-drift')
        if previous['State']['Running']:
            require(current['State']['Running'], 'candidate-worker-not-running')
        original = inspect(previous['Id'])
        require(not original['State']['Running'], 'rollback-worker-unexpectedly-running')
        worker_ids.append(current['Id'])
    return worker_ids


def verify(folder, receipt):
    require(receipt['phase'] == 'applied-awaiting-acceptance', 'release-not-awaiting-acceptance')
    worker_ids = check_runtime(receipt)
    edge = inspect(receipt['edge']['Id'])
    require(edge['Image'] == receipt['edge']['Image'] and edge['State']['Running'], 'edge-identity-drift')
    require(runtime_settings(edge) == runtime_settings(receipt['edge']), 'edge-runtime-settings-drift')
    endpoint_healthy()
    receipt.update(phase='verified', newWorkerIds=worker_ids)
    save(folder, receipt)
    return summary(receipt)


def run(request):
    os.umask(0o077)
    service = request['service']
    require(service['directory'] == str(ROOT) and service['docker_socket'] == SOCKET
            and service['project'] == 'huaqing-team' and service['port'] == 28003
            and service['compose_files'] == [str(COMPOSE)], 'application-scope-refused')
    action = request.get('action', 'plan')
    require(action in ('plan', 'apply', 'verify', 'rollback'), 'action-refused')
    require(action == 'plan' or request.get('confirm') is True, 'explicit-release-confirmation-required')
    parent = ROOT / 'ops/brand-release'
    parent.mkdir(mode=0o700, exist_ok=True)
    require(not parent.is_symlink() and parent.stat().st_mode & 0o077 == 0, 'private-receipt-directory-invalid')
    lock_path = ROOT.parent / '.ansible-ops/harness.lock'
    descriptor = os.open(lock_path, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, 'r+') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if action == 'plan':
            return plan(request, parent)
        receipt_id = request.get('receiptId', '')
        require(re.fullmatch(r'[0-9a-f]{32}', receipt_id), 'receipt-id-required')
        folder = parent / receipt_id
        require(folder.is_dir() and not folder.is_symlink(), 'private-receipt-missing')
        receipt = json.loads((folder / 'receipt.json').read_bytes())
        require(receipt['id'] == receipt_id and receipt['schema'] == 1, 'private-receipt-invalid')
        if action == 'apply':
            return apply(folder, receipt)
        if action == 'verify':
            return verify(folder, receipt)
        require(receipt['phase'] in ('applying', 'applied-awaiting-acceptance', 'verified', 'rollback-incomplete'),
                'rollback-not-applicable')
        return rollback(folder, receipt)


if __name__ == '__main__':
    try:
        result = run(json.load(sys.stdin))
    except Exception as error:
        result = {'verified': False, 'errorType': type(error).__name__, 'phase': PHASE}
        if isinstance(error, RuntimeError):
            result['errorCode'] = str(error)
        if isinstance(error, ReleaseApplyError):
            result['failure'] = error.failure
        if isinstance(error, DeploymentCommandError):
            result['commandCategory'] = error.category
            result['returnCode'] = error.returncode
            if error.probe_error:
                result['probePhase'] = error.probe_error['phase']
                result['probeErrorType'] = error.probe_error['errorType']
    print(json.dumps(result))
    sys.exit(0 if result.get('verified') else 1)
