import importlib.util
import sys
import tempfile
import time
import unittest
from pathlib import Path


ENTRY = Path(__file__).resolve().parents[2] / "scripts" / "wallet-catch-up-runner.py"
spec = importlib.util.spec_from_file_location("wallet_catch_up_runner", ENTRY)
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class WalletRunnerTests(unittest.TestCase):
    def test_second_invocation_cannot_enter_and_manual_cannot_burst(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            with runner.host_lock(path) as fd:
                self.assertIsNotNone(fd)
                with runner.host_lock(path) as competing:
                    self.assertIsNone(competing)
                runner.reserve_tick(fd, 120)
                self.assertFalse(runner.reserve_tick(fd, 179))
                self.assertTrue(runner.reserve_tick(fd, 180))

    def test_whole_worker_timeout(self):
        with tempfile.TemporaryDirectory() as tmp:
            with runner.host_lock(Path(tmp)) as fd:
                started = time.monotonic()
                result = runner.run_worker([sys.executable, "-c", "import time; time.sleep(10)"], fd, timeout=0.2)
                self.assertEqual(result, {"outcome": "timeout"})
                self.assertLess(time.monotonic() - started, 4)

    def test_separate_missed_and_stalled_signals(self):
        now = 6000
        state = {"lastScheduledSuccess": 5990, "backlog": True, "checkpointEpoch": 2300}
        self.assertEqual(runner.alerts(state, now), ["checkpoint-stalled"])
        self.assertEqual(runner.alerts({**state, "lastScheduledSuccess": 5800, "backlog": False}, now), ["scheduled-tick-missed"])

    def test_old_checkpoint_does_not_mark_new_backlog_stalled(self):
        now = 6000
        state = {"lastScheduledSuccess": 5990, "backlog": True, "checkpointEpoch": 2300, "backlogSince": 5995}
        self.assertEqual(runner.alerts(state, now), [])


if __name__ == "__main__":
    unittest.main()
