"""Exercise release failure recovery and preservation against a stateful Docker fake."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.parse

SPEC = importlib.util.spec_from_file_location('brand_release', Path(__file__).with_name('brand-release.py'))
release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release)
OLD_GATEWAY, OLD_WORKER, EDGE = ['sha256:' + digit * 64 for digit in ('1', '2', '3')]
NEW_GATEWAY, NEW_WORKER = ['sha256:' + digit * 64 for digit in ('4', '5')]
WORKER_NAME = 'hqzy-691b9e86-3234-40f8-8ac5-36b61cde50b4'


def container(name, identity, image, running=True):
    worker = name == WORKER_NAME
    network = WORKER_NAME + '-net' if worker else 'huaqing-team-control'
    destinations = [('/home/node/.dsh', name + '-home'), ('/workspace', name + '-workspace')]
    return {'Id': identity * 64, 'Name': '/' + name, 'Image': image,
            'State': {'Running': running, 'StartedAt': 'original', 'Health': {'Status': 'healthy'}},
            'Config': {'Image': image, 'User': '1000:1000' if worker else '',
                       'WorkingDir': '/workspace', 'Entrypoint': ['/entrypoint'], 'Cmd': None,
                       'Env': ['DSH_TEAM_TOKEN=example-token'] if worker else ['TEAM_WORKER_IMAGE=' + OLD_WORKER],
                       'Labels': {'hqzy.team': 'hqzy', 'hqzy.user': WORKER_NAME.removeprefix('hqzy-')}
                       if worker else {'com.docker.compose.project': 'huaqing-team',
                                       'com.docker.compose.service': 'gateway' if name == release.GATEWAY else 'edge',
                                       'com.docker.compose.config-hash': 'e' * 64}},
            'HostConfig': {'ReadonlyRootfs': True, 'NetworkMode': network, 'PortBindings': {},
                           'CapDrop': ['ALL'], 'SecurityOpt': ['no-new-privileges:true'],
                           'Memory': 1024**3, 'MemorySwap': 1024**3, 'NanoCpus': 1000000000,
                           'PidsLimit': 64, 'Mounts': [{'Type': 'volume', 'Source': volume,
                           'Target': target, 'ReadOnly': False} for target, volume in destinations]},
            'Mounts': [{'Type': 'volume', 'Name': volume, 'Source': '/var/lib/private/' + volume,
                        'Destination': target, 'RW': True} for target, volume in destinations],
            'NetworkSettings': {'Networks': {network: {'IPAddress': '10.242.0.3' if worker else '10.241.0.3',
                              'Aliases': [name], 'EndpointID': 'original-endpoint'}}}}


class DockerFake:
    def __init__(self, root):
        self.containers = [container(release.GATEWAY, 'a', OLD_GATEWAY),
                           container(WORKER_NAME, 'b', OLD_WORKER),
                           container(release.EDGE, 'c', EDGE, False)]
        self.operations = []
        self.sequence = 0
        self.activity_counts = {'total': 3, 'running': 0, 'childProcesses': 0}
        self.probe_failure = False
        self.fail_disconnect = False
        self.corrupt_clone = False
        self.gateway_image_user = ''
        self.after_gateway_stop = lambda: None
        self.service = {'directory': str(root), 'docker_socket': release.SOCKET,
                        'project': 'huaqing-team', 'port': 28003, 'compose_files': [str(release.COMPOSE)],
                        'observed_images': {row['Name'].lstrip('/'): row['Image'] for row in self.containers}}

    def find(self, value):
        return next((row for row in self.containers if value in (row['Id'], row['Name'].lstrip('/'))), None)

    def command(self, argv, timeout=120, input=None):
        args = argv[len(release.DOCKER):]
        operation = args[0]
        if operation == 'inspect':
            return json.dumps([copy.deepcopy(self.find(args[1]))])
        if operation == 'image':
            identity = args[2]
            base = OLD_GATEWAY if identity == NEW_GATEWAY else OLD_WORKER if identity == NEW_WORKER else identity
            layers = [base] + ([identity] if base != identity else [])
            return json.dumps([{'Id': identity, 'Os': 'linux', 'Architecture': 'amd64',
                                'RootFS': {'Layers': layers},
                                'Config': {'Env': [], 'User': self.gateway_image_user if identity == NEW_GATEWAY else ''}}])
        if operation == 'ps':
            selector = args[args.index('--filter') + 1]
            if selector.startswith('name=^/'):
                name = selector.removeprefix('name=^/').removesuffix('$')
                selected = self.find(name)
                return selected['Id'] if selected else ''
            return '\n'.join(row['Name'].lstrip('/') for row in self.containers if row['Config']['Labels'].get('hqzy.team') == 'hqzy')
        if operation == 'exec':
            if self.probe_failure:
                raise RuntimeError('fixture-session-list-unavailable')
            return json.dumps(self.activity_counts)
        if operation == 'compose' and 'config' in args:
            return 'gateway ' + 'e' * 64 if '--hash' in args else ''
        self.operations.append(args)
        if operation in ('stop', 'start'):
            identities = args[1:] if operation == 'start' else [args[-1]]
            for identity in identities:
                selected = self.find(identity)
                selected['State']['Running'] = operation == 'start'
                if operation == 'start':
                    writable = {row.get('Name') for row in selected['Mounts'] if row['RW']}
                    assert not any(writable.intersection(row.get('Name') for row in other['Mounts'] if row['RW'])
                                   for other in self.containers if other is not selected and other['State']['Running'])
                    selected['State']['StartedAt'] = 'restarted'
                if operation == 'stop' and identity == release.GATEWAY:
                    self.after_gateway_stop()
        elif operation == 'rename':
            self.find(args[1])['Name'] = '/' + args[2]
        elif operation == 'network' and args[1] == 'disconnect':
            if self.fail_disconnect:
                self.fail_disconnect = False
                raise RuntimeError('fixture-disconnect-failure')
            if not self.find(args[-1])['State']['Running']:
                assert '--force' in args
            self.find(args[-1])['NetworkSettings']['Networks'].pop(args[-2])
        elif operation == 'compose' and 'up' in args:
            selected = self.find(release.GATEWAY)
            compose = json.loads(release.COMPOSE.read_bytes())['services']['gateway']
            if selected['Image'] == compose['image'] and selected['State']['Running'] and '--force-recreate' not in args:
                return ''
            self.sequence += 1
            selected['Id'] = str(self.sequence) * 64
            selected['Image'] = compose['image']
            selected['Config']['Image'] = compose['image']
            selected['Config']['Env'] = ['TEAM_WORKER_IMAGE=' + compose['environment']['TEAM_WORKER_IMAGE']]
            selected['State']['Running'] = True
        else:
            raise AssertionError(args)
        return ''

    def api(self, method, path, body):
        self.operations.append([method, path])
        if path.startswith('/containers/create?'):
            name = urllib.parse.parse_qs(urllib.parse.urlparse(path).query)['name'][0]
            previous = self.containers[1]
            created = copy.deepcopy(previous)
            created.update(Id='d' * 64, Name='/' + name, Image=body['Image'])
            created['State']['Running'] = False
            created['Config'] = {key: value for key, value in body.items() if key not in ('HostConfig', 'NetworkingConfig')}
            created['HostConfig'] = body['HostConfig']
            created['Mounts'] = [{'Type': row['Type'], 'Name': row['Source'],
                                  'Source': '/var/lib/private/' + row['Source'],
                                  'Destination': row['Target'], 'RW': not row['ReadOnly']}
                                 for row in body['HostConfig'].get('Mounts', [])]
            if self.corrupt_clone:
                created['Mounts'] = []
            created['NetworkSettings']['Networks'] = {
                key: dict(value, IPAddress=value['IPAMConfig']['IPv4Address'])
                for key, value in body['NetworkingConfig']['EndpointsConfig'].items()}
            self.containers.append(created)
            return {'Id': created['Id']}
        if '/networks/' in path:
            name = urllib.parse.unquote(path.split('/')[2])
            endpoint = body['EndpointConfig']
            self.find(body['Container'])['NetworkSettings']['Networks'][name] = dict(
                endpoint, IPAddress=endpoint['IPAMConfig']['IPv4Address'])
            return {}
        raise AssertionError(path)


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        root = Path(self.temporary.name) / 'huaqing-harness'
        (root / 'ops').mkdir(parents=True)
        (root.parent / '.ansible-ops').mkdir()
        compose = root / 'ops/compose.switch.json'
        compose.write_text(json.dumps({'services': {'gateway': {'image': OLD_GATEWAY,
                           'environment': {'TEAM_WORKER_IMAGE': OLD_WORKER}}, 'edge': {'image': EDGE}}}))
        for name, value in [('ROOT', root), ('COMPOSE', compose)]:
            target = patch.object(release, name, value)
            target.start()
            self.addCleanup(target.stop)
        self.engine = DockerFake(root)
        for name, value in [('command', self.engine.command), ('api', self.engine.api), ('endpoint_healthy', lambda: None)]:
            target = patch.object(release, name, value)
            target.start()
            self.addCleanup(target.stop)
        self.request = {'service': self.engine.service, 'action': 'plan',
                        'gatewayImage': NEW_GATEWAY, 'workerImage': NEW_WORKER}

    def plan(self):
        receipt = release.run(self.request)
        self.request.update(receiptId=receipt['receiptId'], confirm=True)
        return receipt

    def test_apply_preserves_worker_state_before_gateway_recovery_and_verify(self):
        before = copy.deepcopy(self.engine.containers[1])
        self.plan()
        self.request['action'] = 'apply'
        result = release.run(self.request)
        self.assertEqual(result['phase'], 'applied-awaiting-acceptance')
        self.assertTrue(result['businessAcceptanceRequired'])
        current = self.engine.find(WORKER_NAME)
        self.assertEqual(current['Image'], NEW_WORKER)
        self.assertEqual(release.runtime_settings(current), release.runtime_settings(before))
        self.assertEqual(current['Config']['Env'], before['Config']['Env'])
        private = current['NetworkSettings']['Networks'][WORKER_NAME + '-net']
        self.assertEqual(private['IPAddress'], '10.242.0.3')
        self.assertEqual(private['Aliases'], [WORKER_NAME])
        start_index = next(i for i, args in enumerate(self.engine.operations) if args == ['start', current['Id']])
        gateway_index = next(i for i, args in enumerate(self.engine.operations) if args[0] == 'compose')
        self.assertLess(start_index, gateway_index)
        self.request['action'] = 'verify'
        self.assertEqual(release.run(self.request)['phase'], 'verified')
        self.assertNotIn('example-token', json.dumps(result))

    def test_failed_ingress_restores_images_worker_volume_network_and_stopped_edge(self):
        before = copy.deepcopy(self.engine.containers[1])
        self.plan()
        self.request['action'] = 'apply'
        with patch.object(release, 'endpoint_healthy', side_effect=RuntimeError('fixture-ingress-unavailable')):
            with self.assertRaisesRegex(RuntimeError, 'apply-failed-original-deployment-restored'):
                release.run(self.request)
        worker = self.engine.find(WORKER_NAME)
        self.assertEqual(worker['Id'], before['Id'])
        self.assertEqual(release.runtime_settings(worker), release.runtime_settings(before))
        self.assertEqual(worker['NetworkSettings']['Networks'][WORKER_NAME + '-net']['IPAddress'], '10.242.0.3')
        self.assertTrue(worker['State']['Running'])
        self.assertEqual(self.engine.find(release.GATEWAY)['Image'], OLD_GATEWAY)
        self.assertFalse(self.engine.find(release.EDGE)['State']['Running'])

    def test_compose_drift_rejects_before_stopping_any_container(self):
        self.plan()
        release.COMPOSE.write_text('{}')
        self.request['action'] = 'apply'
        with self.assertRaisesRegex(RuntimeError, 'compose-drift'):
            release.run(self.request)
        self.assertEqual(self.engine.operations, [])

    def test_other_application_and_missing_confirmation_are_rejected(self):
        self.request['service'] = dict(self.engine.service, directory='/srv/apps/huaqing-switch')
        with self.assertRaisesRegex(RuntimeError, 'application-scope-refused'):
            release.run(self.request)
        self.request['service'] = self.engine.service
        self.plan()
        self.request.update(action='apply', confirm=False)
        with self.assertRaisesRegex(RuntimeError, 'explicit-release-confirmation-required'):
            release.run(self.request)
        self.assertEqual(self.engine.operations, [])

    def test_candidate_gateway_user_drift_refuses_plan_before_service_changes(self):
        self.engine.gateway_image_user = 'root'
        self.assertEqual(self.engine.find(release.GATEWAY)['Config']['User'], '')
        with self.assertRaisesRegex(RuntimeError, 'candidate-gateway-user-drift'):
            release.run(self.request)
        self.assertEqual(self.engine.operations, [])

    def test_active_session_unreadable_activity_and_child_process_refuse_changes(self):
        for option, value, message in [('activity_counts', {'total': 3, 'running': 1, 'childProcesses': 0}, 'active-session-refuses-release'),
                                       ('probe_failure', True, 'fixture-session-list-unavailable'),
                                       ('activity_counts', {'total': 3, 'running': 0, 'childProcesses': 1}, 'worker-child-process-refuses-release')]:
            previous = getattr(self.engine, option)
            setattr(self.engine, option, value)
            with self.assertRaisesRegex(RuntimeError, message):
                release.run(self.request)
            setattr(self.engine, option, previous)
            self.assertEqual(self.engine.operations, [])

    def test_new_worker_between_plan_and_apply_refuses_release(self):
        self.plan()
        another = container('hqzy-11111111-1111-1111-1111-111111111111', 'f', OLD_WORKER)
        another['Config']['Labels']['hqzy.team'] = 'hqzy'
        self.engine.containers.append(another)
        self.request['action'] = 'apply'
        with self.assertRaisesRegex(RuntimeError, 'worker-roster-drift'):
            release.run(self.request)
        self.assertEqual(self.engine.operations, [])

    def test_force_disconnect_failure_preserves_original_worker_for_rollback(self):
        self.plan()
        self.engine.fail_disconnect = True
        self.request['action'] = 'apply'
        with self.assertRaisesRegex(RuntimeError, 'apply-failed-original-deployment-restored'):
            release.run(self.request)
        self.assertEqual(self.engine.find(WORKER_NAME)['Id'], 'b' * 64)
        self.assertTrue(self.engine.find(WORKER_NAME)['State']['Running'])
        restorations = [args for args in self.engine.operations if args[0] == 'compose']
        self.assertIn('--force-recreate', restorations[-1])

    def test_running_rollback_worker_refuses_release(self):
        orphan = container(WORKER_NAME, 'f', OLD_WORKER)
        orphan['Name'] += '-brand-rollback-prior'
        self.engine.containers.append(orphan)
        with self.assertRaisesRegex(RuntimeError, 'noncanonical-owned-worker-running'):
            release.run(self.request)
        self.assertEqual(self.engine.operations, [])

    def test_lost_mount_rejects_candidate_and_rolls_back_before_opening_edge(self):
        self.plan()
        self.engine.corrupt_clone = True
        self.request['action'] = 'apply'
        with self.assertRaisesRegex(RuntimeError, 'apply-failed-original-deployment-restored') as rejected:
            release.run(self.request)
        self.assertEqual(rejected.exception.failure, {'phase': 'apply-clone-worker',
                         'errorType': 'ReleaseInvariantError', 'errorCode': 'cloned-worker-settings-drift',
                         'differentFields': ['Mounts']})
        receipt_file = release.ROOT / 'ops/brand-release' / self.request['receiptId'] / 'receipt.json'
        self.assertEqual(json.loads(receipt_file.read_text())['failure'], rejected.exception.failure)
        self.assertEqual(self.engine.find(WORKER_NAME)['Id'], 'b' * 64)
        self.assertEqual(len(self.engine.find(WORKER_NAME)['Mounts']), 2)
        self.assertNotIn(['start', 'c' * 64], self.engine.operations)

    def test_worker_added_after_gateway_stop_rejects_and_restores_original(self):
        self.plan()
        def add_worker_once():
            self.engine.after_gateway_stop = lambda: None
            another = container(WORKER_NAME, 'f', OLD_WORKER, False)
            another['Name'] = '/hqzy-11111111-1111-1111-1111-111111111111'
            self.engine.containers.append(another)
        self.engine.after_gateway_stop = add_worker_once
        self.request['action'] = 'apply'
        with self.assertRaisesRegex(RuntimeError, 'apply-failed-original-deployment-restored'):
            release.run(self.request)
        self.assertEqual(self.engine.find(WORKER_NAME)['Id'], 'b' * 64)
        self.assertTrue(self.engine.find(WORKER_NAME)['State']['Running'])
        restorations = [args for args in self.engine.operations if args[0] == 'compose']
        self.assertEqual(len(restorations), 2)
        self.assertNotIn('--force-recreate', restorations[0])
        self.assertIn('--force-recreate', restorations[1])

    def test_unrepresented_live_gateway_environment_refuses_plan(self):
        self.engine.find(release.GATEWAY)['Config']['Env'].append('TEAM_PUBLIC_ORIGIN=http://192.168.2.11:28003')
        with self.assertRaisesRegex(RuntimeError, 'compose-gateway-environment-drift'):
            release.run(self.request)
        self.assertEqual(self.engine.operations, [])


if __name__ == '__main__':
    unittest.main()
