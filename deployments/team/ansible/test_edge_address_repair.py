"""Verify the narrow Compose edit and preservation during edge repair and rollback."""
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

import test_brand_release as support

SPEC = importlib.util.spec_from_file_location('edge_address_repair', Path(__file__).with_name('repair-harness-edge-address.py'))
repair = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(repair)


class EdgeRepairTests(unittest.TestCase):
    def setUp(self):
        fixture = support.ReleaseTests('test_compose_drift_rejects_before_stopping_any_container')
        fixture.setUp()
        self.addCleanup(fixture.doCleanups)
        self.engine = fixture.engine
        for key, value in [('release', support.release), ('ROOT', support.release.ROOT), ('COMPOSE', support.release.COMPOSE)]:
            target = patch.object(repair, key, value)
            target.start()
            self.addCleanup(target.stop)
        source = json.loads(repair.COMPOSE.read_bytes())
        source['services']['gateway']['environment']['TEAM_TRUSTED_PROXY_IPS'] = '10.241.0.2,127.0.0.1'
        source['services']['edge']['networks'] = {'control': {'ipv4_address': repair.OLD_IP}}
        repair.COMPOSE.write_text(json.dumps(source))
        self.engine.find(support.release.GATEWAY)['Config']['Env'].append('TEAM_TRUSTED_PROXY_IPS=10.241.0.2,127.0.0.1')
        switch = support.container('huaqing-switch-switch-1', 'f', support.EDGE)
        self.engine.containers.append(switch)
        self.network = {'Id': '9' * 64, 'Name': repair.NETWORK, 'Containers': {
            switch['Id']: {'Name': 'huaqing-switch-switch-1', 'IPv4Address': repair.OLD_IP + '/24'}}}
        self.health_failure = False
        original_command = self.engine.command
        def command(argv, timeout=120, input=None):
            args = argv[len(support.release.DOCKER):]
            if args[:2] == ['network', 'inspect']:
                return json.dumps([self.network])
            if args[:3] == ['compose', 'create', '--help']:
                return '--force-recreate --no-build --pull'
            result = original_command(argv, timeout, input)
            if args[0] == 'compose' and 'up' in args:
                current = json.loads(repair.COMPOSE.read_bytes())['services']
                gateway = self.engine.find(support.release.GATEWAY)
                gateway['Config']['Env'] = [key + '=' + value for key, value in current['gateway']['environment'].items()]
                if args[-1] == 'edge':
                    edge = self.engine.find(support.release.EDGE)
                    edge['Id'] = '6' * 64
                    edge['State']['Running'] = True
                    edge['NetworkSettings']['Networks'] = {repair.NETWORK: {
                        'IPAddress': current['edge']['networks']['control']['ipv4_address'],
                        'NetworkID': self.network['Id']}}
            return result
        self.command = command
        original_with_create = command
        def with_create(argv, timeout=120, input=None):
            args = argv[len(support.release.DOCKER):]
            if args[0] == 'compose' and 'create' in args and '--help' not in args:
                self.engine.operations.append(args)
                self.engine.find(support.release.EDGE)['State']['Running'] = False
                return ''
            return original_with_create(argv, timeout, input)
        for key, value in [('command', with_create), ('endpoint_healthy', self.health)]:
            target = patch.object(support.release, key, value)
            target.start()
            self.addCleanup(target.stop)
        self.request = {'service': self.engine.service, 'action': 'plan'}

    def health(self):
        if self.health_failure:
            raise support.release.ReleaseInvariantError('fixture-public-health-failed')

    def test_only_address_and_exact_trust_item_change(self):
        source = json.loads(repair.COMPOSE.read_bytes())
        result = repair.candidate(source)
        self.assertEqual(repair.changed_paths(source, result), list(reversed(repair.CHANGES)))
        self.assertEqual(result['services']['gateway']['environment']['TEAM_TRUSTED_PROXY_IPS'], '10.241.0.5,127.0.0.1')
        self.assertEqual(source['services']['edge']['networks']['control']['ipv4_address'], '10.241.0.2')

    def test_repair_preserves_worker_and_stops_healthy_new_edge(self):
        before = repair.public_state(self.engine.find(support.WORKER_NAME))
        result = repair.run(self.request)
        self.request.update(action='apply', confirm=True, receiptId=result['receiptId'])
        result = repair.run(self.request)
        self.assertEqual(result['phase'], 'verified-edge-stopped')
        self.assertEqual(repair.public_state(self.engine.find(support.WORKER_NAME)), before)
        self.assertFalse(self.engine.find(support.release.EDGE)['State']['Running'])
        self.assertNotIn(['stop', '--time', '30', before['id']], self.engine.operations)

    def test_health_failure_restores_proxy_trust_and_keeps_edge_stopped(self):
        before = repair.COMPOSE.read_bytes()
        result = repair.run(self.request)
        self.request.update(action='apply', confirm=True, receiptId=result['receiptId'])
        self.health_failure = True
        with self.assertRaisesRegex(RuntimeError, 'edge-repair-failed-original-restored'):
            repair.run(self.request)
        self.assertEqual(repair.COMPOSE.read_bytes(), before)
        self.assertIn('TEAM_TRUSTED_PROXY_IPS=10.241.0.2,127.0.0.1', self.engine.find(support.release.GATEWAY)['Config']['Env'])
        self.assertFalse(self.engine.find(support.release.EDGE)['State']['Running'])

    def test_occupied_replacement_address_refuses_before_runtime_changes(self):
        self.network['Containers']['e' * 64] = {'Name': 'another-container', 'IPv4Address': repair.NEW_IP + '/24'}
        with self.assertRaisesRegex(RuntimeError, 'new-edge-address-occupied'):
            repair.run(self.request)
        self.assertEqual(self.engine.operations, [])


if __name__ == '__main__':
    unittest.main()
