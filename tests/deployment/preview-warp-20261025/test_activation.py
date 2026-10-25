import importlib.util
import json
from pathlib import Path
OPERATION = Path(__file__).resolve().parents[3] / ".deployment/operations/preview-warp-20261025"
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("activation", OPERATION.joinpath("activate.py"))
a = importlib.util.module_from_spec(spec)
spec.loader.exec_module(a)
spec = importlib.util.spec_from_file_location("acceptance", OPERATION.joinpath("acceptance.py"))
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)

class ActivationGuards(unittest.TestCase):
    def test_baseline_retains_previous_next_release(self):
        self.assertIn("sophomores-preview-next-20261017", a.NAMES)
        self.assertIn("sophomores-preview-ui-20261018", a.NAMES)
        self.assertIn("sophomores-preview-refresh-20261019-r2", a.NAMES)
        self.assertIn("sophomores-preview-field-20261022", a.NAMES)
        self.assertNotIn("sophomores-preview-warp-20261025", a.NAMES)
        self.assertEqual(len(a.NAMES), 10)

    def test_rollback_acceptance_uses_current_clean_login(self):
        requests = []
        def response(_self, path, **kw):
            requests.append(path)
            if kw.get("cookie") or path == "/login":
                return 200, {}, b""
            return 303, {"location": b.ORIGIN + "/login"}, b""
        with patch.object(Path, "read_text", return_value=json.dumps({"signingSecret": "ab" * 32})), patch.object(b.Suite, "request", response):
            a.old_acceptance(b)
        self.assertEqual(requests, ["/", "/", "/ar/", "/ar/", "/login"])

    def test_rollback_wrong_redirect_is_refused(self):
        def response(_self, path, **kw):
            return (200, {}, b"") if kw.get("cookie") else (303, {"location": b.ORIGIN + "/__preview/login"}, b"")
        with patch.object(Path, "read_text", return_value=json.dumps({"signingSecret": "ab" * 32})), patch.object(b.Suite, "request", response):
            with self.assertRaises(a.GuardFailure):
                a.old_acceptance(b)

    def test_runtime_guards_reject_open_network_or_missing_limits(self):
        from copy import deepcopy
        current = {
            "HostConfig": {"PortBindings": {}, "Memory": 512 * 1024 * 1024,
                "MemorySwap": 512 * 1024 * 1024, "NanoCpus": 500000000,
                "PidsLimit": 128, "SecurityOpt": ["no-new-privileges"],
                "LogConfig": {"Config": {"max-size": "5m", "max-file": "2"}},
                "CapDrop": ["ALL"], "ReadonlyRootfs": True},
            "NetworkSettings": {"Networks": {"sophomores-preview": {"NetworkID": "expected"}}}}
        a.runtime_limits(current, {"network": "expected"}, "app")
        for key, value in [("Memory", 0), ("CapDrop", []), ("SecurityOpt", []), ("PortBindings", {"3000/tcp": []})]:
            changed = deepcopy(current)
            changed["HostConfig"][key] = value
            with self.subTest(key=key), self.assertRaises(a.GuardFailure):
                a.runtime_limits(changed, {"network": "expected"}, "app")
        changed = deepcopy(current)
        changed["NetworkSettings"]["Networks"]["hideaway"] = {"NetworkID": "other"}
        with self.assertRaises(a.GuardFailure):
            a.runtime_limits(changed, {"network": "expected"}, "app")

    def test_auxiliary_lock_order_is_preview_then_tls(self):
        self.assertEqual(a.OPERATION_LOCKS, ('/run/lock/sophomores-preview.lock', '/run/lock/hideaway-nginx-tls.lock'))
        for filename in ('finalize.py', 'cleanup.py', 'resilience.py'):
            self.assertIn('with a.operation_locks():' if filename != 'resilience.py' else 'with activation.operation_locks():', OPERATION.joinpath(filename).read_text())

    def test_safety_guards_survive_optimized_python(self):
        for filename in ('baseline.sh', 'prepare.sh', 'resilience.py', 'activate.py'):
            self.assertNotIn('assert ', OPERATION.joinpath(filename).read_text())

    def test_resilience_report_is_frozen(self):
        self.assertIn("resilience.json", a.FROZEN)

    def test_candidate_config_is_derived_under_lock_and_rechecked(self):
        baseline = (OPERATION / "baseline.sh").read_text()
        activation = (OPERATION / "activate.py").read_text()
        self.assertIn("original.replace('sophomores-preview-field-20261022:3000', 'sophomores-preview-warp-20261025:3000')", baseline)
        self.assertIn("candidate-changed-beyond-upstream", activation)
        self.assertIn("source-provenance.json", a.FROZEN)

if __name__ == "__main__":
    unittest.main()
