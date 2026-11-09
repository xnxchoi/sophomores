import importlib.util
import json
import pathlib
import signal
import subprocess
import sys
import tempfile
import time
import unittest
from unittest import mock

PATH = pathlib.Path(__file__).resolve().parents[2] / 'scripts/resource-guard.py'


class ResourceGuardTests(unittest.TestCase):
    def test_explicit_node_heap_cap_and_inherited_stricter_cap(self):
        self.assertIn('--max-old-space-size=1536', self.guard.node_options(''))
        self.assertIn('--max-old-space-size=3072', self.guard.node_options('', cap=3072))
        self.assertIn('--max-old-space-size=512', self.guard.node_options('--max-old-space-size=512', cap=3072))

    def test_cli_node_heap_cap_bounds_and_forwarding(self):
        for cap in ('63', '3073'):
            with mock.patch.object(sys, 'argv', [str(PATH), '--log', '/tmp/guard-test', '--node-old-space-mib', cap, '--', 'unused']), mock.patch.object(self.guard, 'supervise') as supervise, mock.patch('sys.stderr'):
                with self.assertRaises(SystemExit) as error:
                    self.guard.main()
                self.assertEqual(error.exception.code, 2)
                supervise.assert_not_called()
        for cap in (64, 3072):
            with mock.patch.object(sys, 'argv', [str(PATH), '--log', '/tmp/guard-test', '--node-old-space-mib', str(cap), '--', 'unused']), mock.patch.object(self.guard, 'supervise', return_value=0) as supervise:
                self.assertEqual(self.guard.main(), 0)
                self.assertEqual(supervise.call_args.kwargs['node_old_space_mib'], cap)

    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location('resource_guard', PATH)
        cls.guard = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.guard)

    def run_guard(self, code, **kwargs):
        with tempfile.TemporaryDirectory() as directory:
            code = self.guard.supervise(
                [sys.executable, '-c', code], pathlib.Path(directory) / 'out.log',
                lock_path=pathlib.Path(directory) / 'lock', min_headroom=0,
                max_bytes=96 * 1024**2, timeout=3, log_limit=1024**2,
                **kwargs)
            receipts = list(pathlib.Path(directory).glob('*.metrics.json'))
            self.assertEqual(len(receipts), 1)
            self.assertEqual(json.loads(receipts[0].read_text())['remaining_pids'], [])
            return code

    def test_repeated_prefix_and_private_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            prefix = pathlib.Path(directory)/'log'
            for _ in range(2):
                self.assertEqual(self.guard.supervise([sys.executable, '-c', 'pass'], prefix, min_headroom=0, lock_path=prefix.parent/'lock'), 0)
            logs = list(pathlib.Path(directory).glob('*.log'))
            self.assertEqual(len(logs), 2)
            for path in logs + list(pathlib.Path(directory).glob('*.metrics.json')):
                self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_probe_failure_after_launch_still_kills_group(self):
        calls = 0
        def broken_snapshot():
            nonlocal calls
            calls += 1
            if calls > 2:
                raise RuntimeError('probe unavailable')
            return self.guard.process_snapshot()
        self.assertEqual(self.run_guard('import time; time.sleep(20)', snapshot=broken_snapshot), 137)

    def test_uncertain_cleanup_quarantines_next_launch(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            calls = 0
            def broken_snapshot():
                nonlocal calls
                calls += 1
                if calls > 2:
                    raise RuntimeError('probe unavailable')
                return self.guard.process_snapshot()
            self.assertEqual(self.guard.supervise([sys.executable, '-c', 'import time; time.sleep(10)'], root/'first', lock_path=root/'lock', min_headroom=0, snapshot=broken_snapshot), 137)
            self.assertTrue((root/'lock.quarantine.json').exists())
            self.assertEqual(self.guard.supervise([sys.executable, '-c', 'raise Exception("must not launch")'], root/'second', lock_path=root/'lock', min_headroom=0), 75)
            self.assertFalse(list(root.glob('second.*.log')))

    def test_stale_inflight_blocks_launch(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            (root/'lock.inflight.json').write_text('{}')
            self.assertEqual(self.guard.supervise([sys.executable, '-c', 'pass'], root/'log', lock_path=root/'lock', min_headroom=0), 75)
            self.assertFalse(list(root.glob('*.log')))

    def test_quarantine_write_failure_retains_inflight(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            original_open = self.guard.os.open
            def failing_open(path, *args, **kwargs):
                if str(path).endswith('.quarantine.json'):
                    raise OSError(28, 'synthetic disk full')
                return original_open(path, *args, **kwargs)
            with mock.patch.object(self.guard, 'cleanup', return_value=([], True)), mock.patch.object(self.guard.os, 'open', side_effect=failing_open):
                with self.assertRaises(OSError):
                    self.guard.supervise([sys.executable, '-c', 'pass'], root/'first', lock_path=root/'lock', min_headroom=0)
            self.assertTrue((root/'lock.inflight.json').exists())
            self.assertEqual(self.guard.supervise([sys.executable, '-c', 'pass'], root/'second', lock_path=root/'lock', min_headroom=0), 75)

    def test_launcher_parent_death(self):
        with tempfile.TemporaryDirectory() as directory:
            prefix = pathlib.Path(directory)/'parent-death'
            guard_code = ('import runpy,pathlib,sys; g=runpy.run_path(sys.argv[1]); '
                          'sys.exit(g["supervise"]([sys.executable,"-c","import time; print(123,flush=True); time.sleep(10)"], '
                          'pathlib.Path(sys.argv[2]), lock_path=pathlib.Path(sys.argv[2]+".lock"), min_headroom=0, timeout=4))')
            wrapper = ('import subprocess,sys,pathlib,time; '
                       'subprocess.Popen([sys.executable,"-c",sys.argv[1],sys.argv[2],sys.argv[3]],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); '
                       'end=time.monotonic()+3\n'
                       'while not any(p.stat().st_size for p in pathlib.Path(sys.argv[3]).parent.glob("*.log")) and time.monotonic()<end: time.sleep(.025)')
            subprocess.run([sys.executable, '-c', wrapper, guard_code, str(PATH), str(prefix)], timeout=5, check=True)
            deadline = time.monotonic()+8
            while not list(prefix.parent.glob('*.metrics.json')) and time.monotonic()<deadline:
                time.sleep(.05)
            receipt = json.loads(next(prefix.parent.glob('*.metrics.json')).read_text())
            self.assertEqual(receipt['reason'], 'launcher parent disappeared')
            self.assertEqual(receipt['remaining_pids'], [])

    def test_normal_exit(self):
        self.assertEqual(self.run_guard('print("ok")'), 0)

    def test_child_failure_is_not_success(self):
        self.assertEqual(self.run_guard('import sys; sys.exit(23)'), 23)

    def test_timeout(self):
        self.assertEqual(self.run_guard('import time; time.sleep(10)', deadline_seconds=.15), 124)

    def test_memory_limit(self):
        self.assertEqual(self.run_guard('import time; a=bytearray(48*1024**2); time.sleep(3)', memory_limit=24*1024**2), 137)

    def test_output_limit(self):
        self.assertEqual(self.run_guard('import os,time; os.write(1,b"x"*8192); time.sleep(2)', output_limit=1024), 137)

    def test_accounting_failure(self):
        self.assertEqual(self.run_guard('pass', snapshot=lambda: (_ for _ in ()).throw(RuntimeError('unavailable'))), 137)

    def test_headroom_failure(self):
        self.assertEqual(self.run_guard('pass', headroom=lambda: -1), 137)

    def test_footprint_math_and_parser(self):
        self.assertEqual(self.guard.accounted_bytes(100, 200), 200)
        self.assertEqual(self.guard.parse_vm_stat('Mach Virtual Memory Statistics: (page size of 16384 bytes)\nPages free: 2.\nPages inactive: 3.\nPages speculative: 1.'), 6*16384)

    def test_node_cap(self):
        self.assertEqual(self.guard.node_options('--trace-warnings --max-old-space-size=512'), '--trace-warnings --max-old-space-size=512')
        self.assertIn('--max-old-space-size=1536', self.guard.node_options('--max-old-space-size 8192 --trace-warnings'))

    def test_overlap(self):
        with tempfile.TemporaryDirectory() as directory:
            lock = pathlib.Path(directory) / 'lock'
            with self.guard.checkout_lock(lock):
                self.assertEqual(self.guard.supervise([sys.executable, '-c', 'pass'], pathlib.Path(directory)/'log', lock_path=lock, min_headroom=0), 75)

    def test_leader_exit_cleans_child(self):
        self.assertEqual(self.run_guard('import subprocess,sys; subprocess.Popen([sys.executable,"-c","import time; time.sleep(20)"])'), 137)

    def test_signal_cleanup(self):
        with tempfile.TemporaryDirectory() as directory:
            log = pathlib.Path(directory)/'log'
            script = ('import runpy,pathlib,sys; g=runpy.run_path(sys.argv[1]); '
                      'sys.exit(g["supervise"]([sys.executable,"-c","import time; print(123,flush=True); time.sleep(20)"], '
                      'pathlib.Path(sys.argv[2]), lock_path=pathlib.Path(sys.argv[2]+".lock"), min_headroom=0))')
            process = subprocess.Popen([sys.executable, '-c', script, str(PATH), str(log)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            try:
                deadline = time.monotonic() + 3
                while not any(p.stat().st_size for p in log.parent.glob('log.*.log')) and process.poll() is None and time.monotonic() < deadline:
                    time.sleep(.025)
                self.assertTrue(list(log.parent.glob('log.*.log')), 'supervisor must launch before signal')
                process.send_signal(signal.SIGTERM)
                self.assertEqual(process.wait(timeout=6), 143)
                receipt = json.loads(next(log.parent.glob('*.metrics.json')).read_text())
                self.assertEqual(receipt['remaining_pids'], [])
            finally:
                if process.poll() is None:
                    process.kill()
                    process.wait()


if __name__ == '__main__':
    unittest.main()
