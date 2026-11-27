"""Synthetic-only tests for the carry-forward comparison."""

import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(sys.argv.pop(1)).resolve()
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("carried_state", SCRIPT)
state = importlib.util.module_from_spec(spec)
spec.loader.exec_module(state)


class CarriedStateTest(unittest.TestCase):
    def setUp(self):
        self.new_manifest = "f" * 64
        pins = {"nginx": "1" * 64, "pg": "2" * 64, "prev": "3" * 64}
        self.ref = {
            "manifest": state.OLD_MANIFEST,
            "old_tokens": {
                step + suffix: "4" * 64 for step in state.STEPS for suffix in ("", ".started")
            },
            "pins": pins,
            "pin_generations": {"nginx": ["0001"], "pg": ["0001"]},
            "v4": {"hash": state.V4, "device_inode": "1:42"},
            "networks": {
                name: {
                    "id": str(index) * 64,
                    "driver": "bridge",
                    "internal": internal,
                    "ipv6": False,
                    "subnets": [subnet],
                    "labels": {"co.sophomores.release": state.OLD_LABEL},
                    "options": {"com.docker.network.bridge.name": bridge},
                    "members": [pins[service]] if service else [],
                }
                for index, (name, (bridge, subnet, internal, service)) in enumerate(
                    state.BRIDGES.items(), 5
                )
            },
            "evidence": dict.fromkeys(
                ("nginx_routes", "nginx_other_vhosts", "nginx_attachments",
                 "pg_attachments", "pg_mounts", "preview_origin"), "8" * 64
            ),
        }
        self.obs = {
            "state": copy.deepcopy(self.ref), "new_manifest": self.new_manifest,
            "active_tokens": [], "candidates": [], "inflight": [],
            "unexpected_intents": [], "active_marker": False,
        }
        self.ref_sha = state.fingerprint(self.ref)

    def verify(self):
        return state.verify(self.ref, self.obs, self.ref_sha, self.new_manifest)

    def test_exact_post_n3_comparison_has_scoped_result(self):
        result = self.verify()
        self.assertEqual(result["result"], "offline-comparison-only")
        self.assertEqual(result["reference_sha256"], self.ref_sha)
        self.assertEqual(result["new_manifest"], self.new_manifest)
        self.assertEqual(result["observation_sha256"], state.fingerprint(self.obs))

    def test_replay_or_unfinished_operation_is_rejected(self):
        for field, injected in {
            "active_tokens": ["u2"], "candidates": ["fixture"],
            "inflight": ["old-unit"], "unexpected_intents": ["vhost-intent"],
            "active_marker": True, "new_manifest": "e" * 64,
        }.items():
            with self.subTest(field=field):
                original = self.obs[field]
                self.obs[field] = injected
                with self.assertRaises(ValueError):
                    self.verify()
                self.obs[field] = original

    def test_changed_live_network_route_or_pin_is_rejected(self):
        for section, key, value in (
            ("evidence", "nginx_routes", "9" * 64),
            ("pins", "nginx", "a" * 64),
            ("pin_generations", "nginx", ["0001", "0002"]),
            ("v4", "device_inode", "1:43"),
            ("old_tokens", "n3", "b" * 64),
        ):
            with self.subTest(section=section):
                self.obs["state"] = copy.deepcopy(self.ref)
                self.obs["state"][section][key] = value
                with self.assertRaisesRegex(ValueError, "state drift"):
                    self.verify()
        for field, value in (
            ("id", "c" * 64), ("members", ["d" * 64]),
            ("options", {"com.docker.network.bridge.name": "changed"}),
        ):
            with self.subTest(field=field):
                self.obs["state"] = copy.deepcopy(self.ref)
                self.obs["state"]["networks"]["sophomores-review-egress13"][field] = value
                with self.assertRaisesRegex(ValueError, "state drift"):
                    self.verify()

    def test_wrong_reference_digest_and_illegal_prefix_rejected(self):
        self.ref["old_tokens"]["u4a.started"] = "9" * 64
        with self.assertRaisesRegex(ValueError, "reference digest"):
            self.verify()
        self.ref_sha = state.fingerprint(self.ref)
        self.obs["state"] = self.ref
        with self.assertRaisesRegex(ValueError, "completed prefix"):
            self.verify()

    def test_matching_invalid_reference_and_observation_still_fail(self):
        for path, section, key, value in (
            (("pin_generations",), "nginx", None, ["0001", "0002"]),
            (("networks", "sophomores-review-ingress"), "labels", "fixture", 7),
            (("networks", "sophomores-review-ingress"), "options", "fixture", 7),
        ):
            with self.subTest(section=section):
                reference = copy.deepcopy(self.ref)
                node = reference
                for part in path:
                    node = node[part]
                if key is None:
                    node[section] = value
                else:
                    node[section][key] = value
                observation = {**self.obs, "state": reference}
                with self.assertRaises(ValueError):
                    state.verify(reference, observation, state.fingerprint(reference),
                                 self.new_manifest)

    def test_cli_malformed_json_fails_without_receipt(self):
        with tempfile.TemporaryDirectory() as scratch:
            reference, observation = (Path(scratch) / name for name in ("ref", "obs"))
            reference.write_bytes(state.encoded(self.ref))
            original = json.dumps(self.obs)
            for replacement in ('"active_marker": false, "active_marker": false',
                                '"active_marker": NaN', '"active_marker": Infinity'):
                with self.subTest(replacement=replacement):
                    observation.write_text(original.replace('"active_marker": false', replacement),
                                           encoding="utf-8")
                    result = subprocess.run(
                        [sys.executable, "-I", str(SCRIPT), str(reference), str(observation),
                         self.ref_sha, self.new_manifest],
                        capture_output=True, text=True, check=False,
                    )
                    self.assertEqual(result.returncode, 1)
                    self.assertEqual(result.stdout, "")
                    self.assertEqual(result.stderr, "STOP: invalid or changed carried state\n")


if __name__ == "__main__":
    unittest.main()
